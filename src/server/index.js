/** MODULES */
let url = require('url');
const http = require('http');
const https = require('https');
const fs = require('fs');
let config = require('./config.json');

let router = require('routes/routes');

//Server
const hostname = '127.0.0.1';
const port = 80;

//Server
function serverHandler(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === "/api/environment") {
        router.callRoute(req, res);
    } else if (parsedUrl.pathname === "/api/livescores") {
        router.callRoute(req, res);
    } else if (parsedUrl.pathname === "/api/leaderboards") {
        router.callRoute(req, res);
    } else if (parsedUrl.pathname === "/api/nearbymessage") {
        router.callRoute(req, res);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
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

