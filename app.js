var express = require('express');
var app = express();
const bodyParser = require('body-parser');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
const fs = require('fs');
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

var debug_log = require('debug')('whiteboard:log');
var debug_error = require('debug')('whiteboard:error');


app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.redirect(`/${uuidv4()}`);
})

app.get('/:boardId', function (req, res) {
    res.render('index', {boardId: req.params.boardId, 
        port: process.env.PORT,
        host: process.env.HOST
    });
});


// app.post('/save', function (req, res) {
//     fs.writeFile("./server/data.txt", req.body.data, function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("The file was saved!");
//     });

//     res.status(200).json({
//         message: "Stored successfully"
//     })
// });

// app.get('/load', function (req, res) {
//     fs.readFile('./server/data.txt','utf8', function (err, data) {
//         if (err) {
//             return console.log(err)
//         }
//         const content = data;
//         res.status(200).json({
//             data: content
//         })
//     });
// });

// app.post('/saveHeight', function (req, res) {
//     fs.writeFile("./server/height.txt", req.body.data, function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("The file was saved!");
//     });

//     res.status(200).json({
//         message: "Height Stored successfully"
//     })
// });

// app.get('/getHeight', function (req, res) {
//     fs.readFile('./server/height.txt','utf8', function (err, data) {
//         if (err) {
//             return console.log(err)
//         }
//         const content = data;
//         res.status(200).json({
//             data: content
//         })
//     });
// });

// app.get('/clear', function (req, res) {
//     fs.writeFile("./server/data.txt", "", function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("The file was saved!");
//     });

//     fs.writeFile("./server/height.txt", "700", function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("The file was saved!");
//     });

//     res.status(200).render('index', {admin: false});
// });



io.sockets.on('connection', function (socket) {
    console.log("a user has connected")

    // socket.on('saveData', (id, data) => {
    //     fs.writeFile("./db/" + id + ".txt", data, function(err) {
    //         if(err) {
    //             return console.log(err);
    //         }
    //     });
    //     console.log('saved data');
    // });

    socket.on('join-room', (board_id, user_id) => {
        console.log('someone joined the room');
        socket.join(board_id);
        socket.to(board_id).broadcast.emit('joined-room', user_id);
    });

    socket.on('drawing', (data) => {
        socket.broadcast.emit('elseDrawing', data);
    })

    socket.on('disconnect',() => {
        console.log('Someone disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log("server runs on port " + process.env.PORT);
})
