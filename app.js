var express = require('express');
var app = express();
const bodyParser = require('body-parser');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
require('dotenv').config();
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/'
  });
   
app.use('/peerjs', peerServer);
app.set("view engine", "ejs");
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    board_id = `${uuidv4()}`;
    console.log(board_id);
    res.render('home', {boardId: board_id});
})

app.get('/:boardId', function (req, res) {
    res.render('index', {boardId: req.params.boardId, 
        port: process.env.PORT
    });
});

io.sockets.on('connection', function (socket) {
    console.log("a user has connected");

    socket.on('join-room', (board_id, user_id) => {
        console.log('someone joined the room');
        socket.join(board_id);
        if(io.sockets.adapter.rooms[board_id].length == 1){
            io.in(board_id).emit('stop-loader');
        }
        socket.to(board_id).broadcast.emit('joined-room', user_id);
    });

    socket.on('drawing', (data, board_id) => {
        socket.to(board_id).broadcast.emit('elseDrawing', data);
    })

    socket.on('check-count', (board_id) => {
        if(io.sockets.adapter.rooms[board_id]){
            socket.emit('set-count', io.sockets.adapter.rooms[board_id].length);
        }
    })

    socket.on('disconnect',() => {
        socket.broadcast.emit('check-user-count');
        console.log('Someone disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log("server runs on port " + process.env.PORT);
})
