/** MODULES */
const url = require('url');
const http = require('http');
const fs = require('fs');

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
    fs.appendFile('logs/twproj-' + (new Date()).toString()
                    .replace(/ /g, "_")
                    .replace(/:/g, "_") + '.log', msg, function (err) {
        if (err)
            throw err;
        console.log(msg);
    });
}

//Config
try {
    config = fs.readFileSync('config.json', {encoding:'utf8', flag:'r'});
}
catch (e) {
    logToFile('Config file not found');
    return;
}
config = JSON.parse(config);

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
    playerMap.set(socket.id, {coordinates: [0,0], socket: socket});

    socket.on('coordonate', function (obj) {
        let parsedObj = JSON.parse(obj);

        playerMap.set(socket.id, {coordinates: parsedObj.coordinates, socket:socket});
    });

    socket.on('disconnect', function () {
        playerMap.delete(socket.id);
    });
});

//Server logic
playerMap = new Map(); //player Map -> has socket and coordinates

function distance(point1, point2){
    return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
}

function sendOtherPlayerCoordinates(){
    let dist;
    playerMap.forEach((firstPlayerObj, firstPlayerId) => {
        //search through other players

        let otherPlayers = [];
        playerMap.forEach((otherPlayerObj, otherPlayerId) => {
            dist = distance(otherPlayerObj.coordinates, firstPlayerObj.coordinates);
            if (firstPlayerId !== otherPlayerId && !isNaN(dist) && dist < radius){
                otherPlayers.push(otherPlayerObj.coordinates);
            }
        });

        if (otherPlayers.length){
            firstPlayerObj.socket.emit('other_player', otherPlayers);
        }
    });
}

setInterval(sendOtherPlayerCoordinates, 1000);