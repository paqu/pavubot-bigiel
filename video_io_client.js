#!/usr/bin/env node

var io = require('socket.io-client');
var fs = require('fs')
var cv = require('opencv');
var logger   = require('simple-logger');
var chokidar = require('chokidar');
var commandLineArgs = require('command-line-args');

var options = commandLineArgs([
        { name : 'host',alias:'h', type: String },
        { name : 'port',alias:'p', type: Number },
        { name : 'ddal_path',alias:'d', type: String },
        { name : 'fps' ,alias:'f', type: Number },
]);

var FPS  = options.fps;
var PORT = options.port;
var HOST = options.host;
var DDAL_PATH = options.ddal_path;

if (!FPS)
    FPS = 20;

if (!PORT)
    PORT = 1234;

if (!HOST)
    HOST = 'localhost';

if (!DDAL_PATH)
    DDAL_PATH = '';


var url = 'http://'+ HOST + ':' + PORT+'/video';

var conn = io(url);
var interval;
var camWidth = 320;
var camHeight = 240;
var camInterval = 1000 / FPS;
var camera;


var isDetectFaceActive;

const VIDEO_SOCKET_ID = "video_socket_id";

var paths = new Array();

paths[VIDEO_SOCKET_ID] = DDAL_PATH + "ddal/socket/video_socketId";

camera = new cv.VideoCapture(0);
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

conn.on('video::video_socket_id', function (data) {
    logger('get socket id:'+ data.socket_id + ' from server.');
    writeToFile(paths[VIDEO_SOCKET_ID], data.socket_id);
});


conn.on("video::stop_video", function () {
    logger("[on] video:stop_video");
    clearInterval(interval);
});

conn.on("video::start_video",function () {
    logger("[on] video::start_video");
    interval = setInterval(function () {
        camera.read(function(err, im) {
            if (err) throw err;

            logger("[emit]:server:video:frame");
            conn.emit("server:video:frame",{ frame: im.toBuffer() });
        });
    },camInterval);
});

function writeToFile(path, value) {
    fs.writeFile(path, value, (err) => {
          if (err) throw err;
          logger('Write  (' + value +') to ' + path);
    });
}
function removeWhiteSigns(data) {
    return data.replace(/^\s+|\s+$/g, "");
}
