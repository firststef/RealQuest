const url = require('url');
const http = require('http');
var io = require('socket.io')(80);

var playerCoordinates = [[0,0], [0,0]];

var firstClient;
var secondClient;

io.on('connection', function (socket) {
    socket.on('coordonate', function (obj) {
        let parsedObj = JSON.parse(obj);

        if (firstClient === undefined)
            firstClient = socket.id;
        else
            secondClient = socket.id;

        if (firstClient === socket.id)
        {
            playerCoordinates[0] = parsedObj.coordinates;
            console.log('Player1', playerCoordinates[0]);
        }
        else if (secondClient === socket.id){
            playerCoordinates[1] = parsedObj.coordinates;
        }

        if (firstClient === socket.id)
        {
            socket.emit('other_player', JSON.stringify(playerCoordinates[1]));
        }
        else if (secondClient === socket.id) {
            socket.emit('other_player', JSON.stringify(playerCoordinates[0]));
        }
    });

    socket.on('disconnect', function () {

    });
});

const app = http.createServer((request, response) => {
        response.write("test");
        response.end();
});

app.listen(3000);