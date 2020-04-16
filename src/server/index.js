const url = require('url');
const http = require('http');
var io = require('socket.io')(80);

var playerMap = new Map();
//player Map -> has socket and coordinates

function distance(point1, point2){
    return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
}

let radius = 0.5;
function sendOtherPlayerCoordinates(){
    let dist;
    playerMap.forEach((firstPlayerObj, firstPlayerId) => {
        //search through other players

        let otherPlayers = [];
        playerMap.forEach((otherPlayerObj, otherPlayerId) => {
            dist = distance(otherPlayerCoords.coordinates, firstPlayerCoords.coordinates);
            if (firstPlayerId !== otherPlayerId && !isNaN(dist) && dist < radius){
                otherPlayers.push(otherPlayerObj.coordinates);
            }
        });

        if (otherPlayers.length){
            otherPlayers.forEach((socket) => {
                socket.emit('other_player', otherPlayers);
            });
        }
    });
}

setInterval(sendOtherPlayerCoordinates, 1000);

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

const app = http.createServer((request, response) => {
        response.write("test");
        response.end();
});

app.listen(3000);