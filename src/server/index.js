/** MODULES */
const url = require('url');
const http = require('http');
const https = require("https");
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const mongoUri = "mongodb+srv://twproj:realquest@realquest-5fa4g.gcp.mongodb.net/test?retryWrites=true&w=majority";

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
    msg = JSON.stringify(msg);
    fs.appendFile('twlogs/twproj-' + (new Date()).toString()
        .replace(/ /g, "_")
        .replace(/:/g, "_") + '.log', msg, function (err) {
        if (err)
            throw err;
        console.log(msg);
    });
}
process.on('uncaughtException', function (err) {
    logToFile('Caught exception: ' + err.toString() + err.stack.toString());
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
const client = MongoClient.connect(mongoUri, {useNewUrlParser: true, useUnifiedTopology: true});

//Server
function serverHandler(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === "/api/environment") {
        if (parsedUrl.query.long !== undefined && parsedUrl.query.lat !== undefined) {
            let playerPos = [parsedUrl.query.long, parsedUrl.query.lat];
            sendBackWeatherAndTime(res, playerPos);
            return;
        }
    } else if (parsedUrl.pathname === "/api/livescores") {
        if (parsedUrl.query.count !== undefined && parsedUrl.query.count > 0) {
            sendBackLiveScores(res, parsedUrl.query.count);
            return;
        }
    } else if (parsedUrl.pathname === "/api/leaderboards") {
        if (parsedUrl.query.count !== undefined) {
            sendBackLeaderBoards(res, parsedUrl.query.count, parsedUrl.query.myScore);
            return;
        }
    } else if (parsedUrl.pathname === "/api/nearbymessage") {
        if (parsedUrl.query.long !== undefined && parsedUrl.query.lat !== undefined) {
            let playerPos = {longitude: parsedUrl.query.long, latitude: parsedUrl.query.lat};
            sendBackNearbyMessage(res, playerPos);
            return;
        }
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
        res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
        res.setHeader("Expires", "0");
        let data;
        var resource = config.resources[parsedUrl.pathname];
        if (resource !== undefined) {
            try {
                data = fs.readFileSync(resource.path);
                res.statusCode = 200;
                res.setHeader('Content-Type', resource.type);
                res.write(data);
                res.end();
                return;
            } catch (e) {
                logToFile("File not read:" + req.url);
            }
        } else {
            logToFile("Path not registered:" + req.url);
        }
    }
    res.writeHead(404);
    res.write('Not found');
    res.end();
}

server = http.createServer(serverHandler);
server.listen(port);

//Socket
var io = require('socket.io')(server);
io.origins('*:*');
io.on('connection', function (socket) {
    playerMap.set(socket.id, {coordinates: 0, currentPoints: 0, socket: socket, username: socket.handshake.query.username});

    socket.on('coordonate', function (obj) {
        playerMap.get(socket.id).coordinates = obj.coordinates;
        playerMap.get(socket.id).currentPoints = obj.currentPoints;
        playerMap.get(socket.id).currentAnimation = obj.currentAnimation;
        playerMap.get(socket.id).currentAnimationFrame = obj.currentAnimationFrame;
        playerMap.get(socket.id).currentFrame = obj.currentFrame;
        playerMap.get(socket.id).scaleX = obj.scaleX;

        socket.emit("other_player", JSON.stringify(getNearbyPlayers(playerMap.get(socket.id), socket.id)));
    });

    socket.on('disconnect', function () {
        let playerObj = playerMap.get(socket.id);
        let playerScore = playerObj.currentPoints;
        if(playerScore !== 0){
            client
                .then(client => client.db("RealQuestDB").collection("leaderboard").insertOne({username:playerObj.username, score:playerScore}))
                .then(playerMap.delete(socket.id))
                .catch(e => logToFile(e));
        }
    });

    socket.on('new_message',function(msg){
        io.emit('chat-message',msg);
    });
});
function removeZombieConnections(){
    playerMap.forEach((value, key, map)=> {
        let socketList = io.sockets.server.eio.clients;
        if (socketList[key] === undefined){
            map.delete(key);
        }
    });
}
setInterval(removeZombieConnections,10000);

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
            otherPlayers.push({
                id: otherPlayerId,
                username: otherPlayerObj.username,
                coordinates: otherPlayerObj.coordinates,
                currentPoints:otherPlayerObj.currentPoints,
                currentAnimation : otherPlayerObj.currentAnimation ,
                currentAnimationFrame : otherPlayerObj.currentAnimationFrame,
                currentFrame : otherPlayerObj.currentFrame,
                scaleX : otherPlayerObj.scaleX
            });
        }
    });

    return otherPlayers;
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

//Live scores api
function sendBackLiveScores(res, count) {
    var LiveScores=Array();
    playerMap.forEach((otherPlayerObj, otherPlayerId) =>{
        LiveScores.push({username:otherPlayerObj.username, currentPoints: otherPlayerObj.currentPoints});
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

//Leader Board Api
function sendBackLeaderBoards(res, count, myScore) {
    if (myScore === undefined)
        myScore = 0;
    myScore = parseFloat(myScore);

    client
        .then(client => client.db("RealQuestDB")
            .collection("leaderboard")
            .find({score: {$gt: myScore}}, {projection:{_id: 0}})
            .sort({score: -1, username: -1})
            .toArray(function (err, docs) {
                if (err)
                    throw err;

                let length = docs.length;
                if (count !== -1 && count > 0){
                    docs.splice(count, docs.length);
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/json');
                res.write(JSON.stringify({players: docs, myPlace: length}));
                res.end();
            })
        )
        .catch(e => {
            logToFile(e);
            res.writeHead(404);
            res.write('Not found');
            res.end();
        });
}

function getGameStartTime(context) {
    let playerPos = context.playerPos;
    //https://dev.virtualearth.net/REST/v1/timezone/61.768335,-158.808765?key=AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7
    let timeRequest = "https://dev.virtualearth.net/REST/v1/timezone/" + playerPos[1] + "," + playerPos[0]
        + "?key=AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7";
    var gameStartTime;
    let data = '';
    https.get(timeRequest, res=>{
        res.setEncoding("utf8");
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on("end", function () {
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
    let data = '';
    https.get(weatherRequest, res=>{
        res.setEncoding("utf8");
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on("end", function () {
            data=JSON.parse(data);
            context.weather=data;
            context.apiLoader.notifyCompleted('loadWeather');
        });
    });
}

function sendBackWeatherAndTime(res, playerPos) {
    let apiLoader = new ApiLoader(
        {
            loadTime: getGameStartTime,
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

function getBestNearbyMessage(playerPos, features) {
    let bestStreet = {dist: Infinity};
    features.forEach(obj => {
        if (obj["geometry"]["type"] === "Point"){
            if (obj["properties"]["class"] === "street" || obj["properties"]["class"] === "primary"){
                let dist = distance([playerPos.latitude, playerPos.longitude], obj["geometry"]["coordinates"]);
                if (bestStreet.dist !== undefined && obj["properties"]["name"] !== undefined && bestStreet.dist > dist){
                    bestStreet.dist = dist;
                    bestStreet.name = obj["properties"]["name"];
                }
            }
        }
    });

    let returnObj = {};
    if (bestStreet.dist !== Infinity){
        returnObj.name = bestStreet.name;
        returnObj.description = "You are traveling on";
    }

    return returnObj;
}

function sendBackNearbyMessage(res, playerPos) {
    let reqUri = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${playerPos.longitude},${playerPos.latitude}.json?radius=60&limit=8&dedupe&access_token=pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA`;
    let data = '';
    https.get(reqUri, result => {
        result.setEncoding("utf8");
        result.on('data', function(chunk) {
            data += chunk;
        });
        result.on("end", function () {
            data = JSON.parse(data);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/json');
            res.write(JSON.stringify(getBestNearbyMessage(playerPos, data["features"])));
            res.end();
        });
    })
}