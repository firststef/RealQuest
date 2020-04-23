/** MODULES */
const url = require('url');
const http = require('http');
const https = require("https");
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://twproj:realquest@realquest-5fa4g.gcp.mongodb.net/test?retryWrites=true&w=majority";

/** VARIABLES */
let config;

//Logic
let playerMap = new Map(); //player Map -> has socket and coordinates
let radius = 0.5;

//Server
const hostname = '127.0.0.1';
const port = 80;

/** LOGIC */
//Logger
function logToFile(msg){
    fs.appendFile('twlogs/twproj-' + (new Date()).toString()
        .replace(/ /g, "_")
        .replace(/:/g, "_") + '.log', msg, function (err) {
        if (err)
            throw err;
        console.log(msg);
    });
}
process.on('uncaughtException', function (err) {
    logToFile('Caught exception: ' + err.toString());
});

//Config
try {
    config = fs.readFileSync('config.json', {encoding:'utf8', flag:'r'});
}
catch (e) {
    logToFile('Config file not found');
    return;
}
config = JSON.parse(config);

//MongoDB
const client = MongoClient.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});

//Server
function serverHandler(req, res) {
    let data;
    const parsedUrl = url.parse(req.url, true);
    var resource= config.resources[parsedUrl.pathname];
    if (parsedUrl.pathname==="/api/environment") {
        let playerPos=[parsedUrl.query.long, parsedUrl.query.lat];
        sendBackWeatherAndTime(res, playerPos);
        return;
    }
    else if (parsedUrl.pathname==="/api/livescores"){
        sendBackLiveScores(res, parsedUrl.query.count);
        return;
    }
    else {
        if (resource === undefined){
            logToFile("Path not registered:" + req.url);
            res.writeHead(404);
            res.write('<h1>Not found</h1>');
            res.end();
            return;
        }
        try {
            data = fs.readFileSync(resource.path);
        }
        catch (e) {
            logToFile("File not read:" + req.url);
            res.writeHead(404);
            res.write('<h1>Not found</h1>');
            res.end();
            return;
        }
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', resource.type);
    res.write(data);
    res.end();
}

server = http.createServer(serverHandler);
server.listen(port);

//Socket
var io = require('socket.io')(server);
io.origins('*:*');
io.on('connection', function (socket) {
    console.log(socket.handshake.query);
    playerMap.set(socket.id, {coordinates: 0, currentPoints: 0, socket: socket, username: socket.handshake.query.username});

    socket.on('coordonate', function (obj) {
        //console.log("MapLength ", playerMap.size);
        //console.log(obj.currentPoints);
        playerMap.get(socket.id).coordinates = obj.coordinates;
        playerMap.get(socket.id).currentPoints = obj.currentPoints;

        socket.emit("other_player", JSON.stringify(getNearbyPlayers(playerMap.get(socket.id), socket.id)));
    });

    socket.on('disconnect', function () {
        let playerObj = playerMap.get(socket.id);
        console.log(playerObj);
        let playerScore = playerObj.currentPoints;
        if(playerScore !== 0){
        client
            .then(client => client.db("RealQuestDB").collection("leaderboard").insertOne({username:playerObj.username, score:playerScore}))
            .then(playerMap.delete(socket.id))
            .catch(e => console.log(e));
        }
    });
});

//Server logic

function distance(point1, point2){
    return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
}

function getNearbyPlayers(firstPlayerObj, firstPlayerId) {
    let otherPlayers=Array();
    let dist;
    playerMap.forEach((otherPlayerObj, otherPlayerId) => {
        if (otherPlayerObj.coordinates === 0)
            return;
        dist = distance(otherPlayerObj.coordinates, firstPlayerObj.coordinates);
        if (firstPlayerId !== otherPlayerId && !isNaN(dist) && dist < radius){
            otherPlayers.push({id: otherPlayerId, coordinates: otherPlayerObj.coordinates, currentPoints:otherPlayerObj.currentPoints});
        }
    });

    return otherPlayers;
}
//Live scores api
function sendBackLiveScores(res, count) {
    var LiveScores=Array();
    playerMap.forEach((otherPlayerObj, otherPlayerId) =>{
        LiveScores.push({id:otherPlayerId, currentPoints: otherPlayerObj.currentPoints});
    });
    LiveScores.sort(function(a, b) {
        return b.currentPoints-a.currentPoints;
    });
    LiveScores=LiveScores.slice(0, count);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/json');
    res.write(JSON.stringify(LiveScores));
    res.end();
}

//Time and Weather "Api"

class ApiLoader{
    constructor(callbackObject, onCallbackEnd, context) {
        this.callbackObject = callbackObject;
        this.completedCallbacks = [];
        this.onCallbackEnd = onCallbackEnd;
        this.context = context;
        this.context.apiLoader = this;
    }

    load(){
        Object.values(this.callbackObject).forEach((callback) => callback(this.context));
    }

    notifyCompleted(callbackKey){
        this.completedCallbacks.push(callbackKey);
        this.handleCompleted();
    }

    isFinished(){
        return Object.keys(this.callbackObject).every((key) => this.completedCallbacks.includes(key));
    }

    handleCompleted(){
        if (this.isFinished()){
            this.onCallbackEnd(this.context);
        }
    }
}

function setGameStartTime(context) {
    let playerPos = context.playerPos;
    //https://dev.virtualearth.net/REST/v1/timezone/61.768335,-158.808765?key=AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7
    let timeRequest = "https://dev.virtualearth.net/REST/v1/timezone/" + playerPos[1] + "," + playerPos[0]
        + "?key=AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7";
    var gameStartTime;
    https.get(timeRequest, res=>{
        res.setEncoding("utf8");
        res.on("data", data => {
            data = JSON.parse(data);
            try {
                let time = new Date(data.resourceSets[0].resources[0].timeZone["convertedTime"]["localTime"]);
                gameStartTime = time.getHours() * 60 + time.getMinutes();
            } catch (e) {
                gameStartTime = getCurrentTime(playerPos);
            }
            if (gameStartTime < 0 || gameStartTime > 24 * 60 || isNaN(gameStartTime) || gameStartTime == null) {
                gameStartTime = getCurrentTime(playerPos);
            }
            //console.log(gameStartTime, "1");
            context.time=gameStartTime;
            context.apiLoader.notifyCompleted('loadTime');
        });
    });
}

function getWeather(context){
    let playerPos = context.playerPos;
    const openWeatherAccessToken="8fbb3329e2b667344c3392d6aea9362e";
    let weatherRequest="https://api.openweathermap.org/data/2.5/weather?lat="+playerPos[1]+"&lon="+playerPos[0]
        +"&appid="+openWeatherAccessToken;
    https.get(weatherRequest, res=>{
        res.setEncoding("utf8");
        res.on("data", data =>{
            data=JSON.parse(data);
            context.weather=data;
            context.apiLoader.notifyCompleted('loadWeather');
        });
    });
}

function sendBackWeatherAndTime(res, playerPos) {
    let apiLoader = new ApiLoader(
        {
            loadTime: setGameStartTime,
            loadWeather: getWeather
        },
        (context) => {
            context.res.statusCode = 200;
            context.res.setHeader('Content-Type', 'text/json');
            context.res.write(JSON.stringify({time: context.time, weather: context.weather}));
            context.res.end();
        },{
            res: res,
            playerPos: playerPos
        }
    );
    apiLoader.load();
}
/**
 * returneaza timpul exact, dinamic, poate duce la variatii dese ale culorii daca se fataie jucatorul la stanga si la dreapta longitudinilor M15
 * @returns {number} = minutul si ora curenta a jocului la coordonatele actuale, pentru a fi eventula afisate intr-o parte a ecranului
 */
function getCurrentTime(playerPos) {
    let offset=Math.floor(playerPos[0]/15);
    if (offset<0) offset++;
    let d=new Date();
    let n=d.getUTCHours()+offset;
    if (n<0) n=24-n;
    if (n>=24) n=n-24;
    return n*60+d.getUTCMinutes();
}