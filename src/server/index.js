/** MODULES */
const url = require('url');
const http = require('http');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://twproj:realquest@realquest-5fa4g.gcp.mongodb.net/test?retryWrites=true&w=majority";
/** VARIABLES */
let config;

//Logic
let playerMap;
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
    const parsedUrl = url.parse(req.url, true);
    const resource = config.resources[parsedUrl.pathname];

    if (resource === undefined){
        logToFile("Path not registered:" + req.url);
        res.writeHead(404);
        res.write('<h1>Not found</h1>');
        res.end();
        return;
    }

    let data;
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
    playerMap.set(socket.id, {coordinates: 0, currentPoints: 0, socket: socket});

    socket.on('coordonate', function (obj) {
        console.log("MapLength ", playerMap.size);
        //console.log(obj.currentPoints);
        playerMap.set(socket.id, {coordinates: obj.coordinates, currentPoints: obj.currentPoints, socket:socket});

        socket.emit("other_player", JSON.stringify(getNearbyPlayers(playerMap.get(socket.id), socket.id)));
    });

    socket.on('disconnect', function () {
        let playerScore = playerMap.get(socket.id).currentPoints;
        console.log("Disconnected");
        if(playerScore != 0){
        client
            .then(client => client.db("RealQuestDB").collection("leaderboard").insertOne({name:"test", score:playerScore}))
            .then(playerMap.delete(socket.id))
            .catch(e => console.log(e));
        }
    });
});

//Server logic
playerMap = new Map(); //player Map -> has socket and coordinates

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
