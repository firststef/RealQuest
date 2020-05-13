/** MODULES */
let url = require('url');
const http = require('http');
const https = require('https');
const fs = require('fs');

let router = require('../server/routes/routes');
let model = require('../server/model/index');
let logToFile = require('../server/utils/logger')

//Server
const port = 80;
function serverFunc(req, res) {
    router.callRoute(req, res);
}

server = http.createServer(serverFunc);
server.listen(port);

//Socket
let playerMap = model.getPlayerMap();

function distance(point1, point2) {
    return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
}

const radius = 0.5;
function getNearbyPlayers(firstPlayerObj, firstPlayerId) {
    let otherPlayers = Array();
    let dist;
    playerMap.forEach((otherPlayerObj, otherPlayerId) => {
        if (otherPlayerObj.coordinates === 0)
            return;
        dist = distance(otherPlayerObj.coordinates, firstPlayerObj.coordinates);
        if (firstPlayerId !== otherPlayerId && !isNaN(dist) && dist < radius) {
            otherPlayers.push({
                id: otherPlayerId,
                username: otherPlayerObj.username,
                coordinates: otherPlayerObj.coordinates,
                currentPoints: otherPlayerObj.currentPoints,
                currentAnimation: otherPlayerObj.currentAnimation,
                currentAnimationFrame: otherPlayerObj.currentAnimationFrame,
                currentFrame: otherPlayerObj.currentFrame,
                scaleX: otherPlayerObj.scaleX
            });
        }
    });

    return otherPlayers;
}

let io = require('socket.io')(server);
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
            model.getMongoClient()
                .then(client => client.db("RealQuestDB").collection("leaderboard").insertOne({username:playerObj.username, score:playerScore}))
                .then(playerMap.delete(socket.id))
                .catch(e => logToFile(e));
        }
    });

    socket.on('new_message',function(obj){
        obj.message = obj.message.substring(0, 50);
        io.emit('chat-message',obj);
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

