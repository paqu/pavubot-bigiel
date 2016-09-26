var io = require('socket.io-client');
var fs = require('fs')
var commandLineArgs = require('command-line-args');
var cv = require('opencv');
var logger = require('simple-logger');
var dgram = require('dgram');
var client_socket = dgram.createSocket('udp4');

var options = commandLineArgs([
        { name : 'host',alias:'h', type: String },
        { name : 'port',alias:'p', type: Number },
        { name : 'fps' ,alias:'f', type: Number },
]);

var FPS  = options.fps;
var PORT = options.port;
var HOST = options.host;

if (!FPS)
    FPS = 20;

if (!PORT)
    PORT = 1234;

if (!HOST)
    HOST = 'localhost';

var url = 'http://'+ HOST + ':' + PORT+'/video';

var conn = io(url);
var interval;
var camWidth = 320;
var camHeight = 240;
var camInterval = 1000 / FPS;
var camera = new cv.VideoCapture(0);
camera.setWidth(camWidth);
camera.setHeight(camHeight);


conn.on('connect', function (data) {
    logger('Connected to ' + url);
});

conn.on('disconnect', function () {
});

conn.on('connect_error', function (err) {
    logger("Connect error: " + err);
});

conn.on('connect_timeout', function () {
    logger("Connect timeout");
});

conn.on('reconnect', function (attempt_number) {
    logger("Reconnect after  [" + attempt_number + "]");
});

conn.on('reconnect_attempt', function () {
    logger("Reconnect attempt");
});

conn.on('reconnection', function (nr) {
    logger("Reconnectiong nr " + nr);
});

conn.on('reconnect_error', function (err) {
    logger("Recconect error: " + err);
});

conn.on('reconnect_failed', function () {
    logger("Recconect failed");
});

conn.on('error', function (err) {
    logger("Error: " + err);
});

conn.on('video:video_socketId', function (data) {
    logger('get socket id:'+ data.socketId + ' from server.');
    writeToFile('dev/ddal/socket/video_socketId', data.socketId);
});


conn.on("video:stop_video", function () {
    logger("[on] video:stop_video");
    clearInterval(interval);
});

conn.on("video:start_video",function () {
    logger("[on] video:start_video");
    interval = setInterval(function () {
        camera.read(function(err, im) {
            if (err) throw err;
            logger("[emit]:server_video_nsp:frame");

            //conn.emit("server_video_nsp:frame",{ frame: im.toBuffer() });

            chunk = im.toBuffer();
            client_socket.send(chunk,0,chunk.length,8888,'localhost');
        });
    },camInterval);
});


function writeToFile(path, value) {
    fs.writeFile(path, value, (err) => {
          if (err) throw err;
          logger('Saved socket id (' + value +') to ' + path);
    });
}






