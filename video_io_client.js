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
        { name : 'path',alias:'P', type: String },
        { name : 'fps' ,alias:'f', type: Number },
        { name : 'modules_path' ,alias:'m', type: String },
]);

var FPS  = options.fps;
var PORT = options.port;
var HOST = options.host;
var PATH = options.path
var MODULES_PATH  = options.modules_path

if (!FPS)
    FPS = 20;

if (!PORT)
    PORT = 1234;

if (!HOST)
    HOST = 'localhost';

if (!PATH)
    PATH = '';

if (!MODULES_PATH)
   MODULES_PATH  = '.';

var url = 'http://'+ HOST + ':' + PORT+'/video';

var conn = io(url);
var interval;
var camWidth = 320;
var camHeight = 240;
var camInterval = 1000 / FPS;
var camera;

var rectColor = [0, 255, 0];
var rectThickness = 2;

var isDetectFaceActive = false;

const VIDEO_SOCKET_ID = "video_socket_id";
const DISTANCE_SENSOR_SONAR    = "distance_sensor_sonar";
const DISTANCE_SENSOR_INFRARED = "distance_sensor_infrared";

var paths = new Array();

paths[VIDEO_SOCKET_ID]          = PATH + "ddal/socket/video_socketId";
/*
paths[DISTANCE_SENSOR_SONAR]    = PATH + "ddal/distance_sensor/sonar";
paths[DISTANCE_SENSOR_INFRARED] = PATH + "ddal/distance_sensor/infrared";
*/


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

var faceRecognizeInterval = true;
var faceCascade = MODULES_PATH + '/node_modules/opencv/data/haarcascade_frontalface_alt2.xml';

conn.on("video::start_video",function () {
    logger("[on] video::start_video");
    interval = setInterval(function () {
        camera.read(function(err, im) {
            if (err) throw err;

            if (isDetectFaceActive) {
                im.detectObject(faceCascade,{}, function(err, faces) {

                    if (err) throw err;

                    for (var i = 0; i < faces.length; i++) {
                      logger("[emit]:server:video:face");
                      conn.emit("server:video:face",{ face: im.toBuffer() });
                      face = faces[i];
                      im.rectangle([face.x, face.y], [face.width, face.height],
                              rectColor, rectThickness);
                    }

                    if (faceRecognizeInterval) {
                        logger("[emit]:server:video:frame");
                        conn.emit("server:video:frame",{ frame: im.toBuffer() });
                    }

                    faceRecognizeInterval = false;
                    setTimeout(function() {
                        faceRecognizeInterval = true;
                    },1000);

                });
            }else {
                logger("[emit]:server:video:frame");
                conn.emit("server:video:frame",{ frame: im.toBuffer() });
            }
        });
    },camInterval);
});


function writeToFile(path, value) {
    fs.writeFile(path, value, (err) => {
          if (err) throw err;
          logger('Write  (' + value +') to ' + path);
    });
}

/*

var listener = {
    distance_sensor_sonar:{},
    distance_sensor_infrared:{}
};

listener.distance_sensor_sonar = chokidar.watch(paths[DISTANCE_SENSOR_SONAR], {
    persistent: true
});

listener.distance_sensor_infrared = chokidar.watch(paths[DISTANCE_SENSOR_INFRARED], {
    persistent: true
});


listener.distance_sensor_sonar.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[DISTANCE_SENSOR_SONAR],'utf8', (err, data) => {
            if (err) throw err;

            var distance = Number(data);

            if (distance <= 15) {
                isDetectFaceActive = true;
            } else {
                isDetectFaceActive = false;
            }
        });
    },100);
});

listener.distance_sensor_infrared.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[DISTANCE_SENSOR_INFRARED],'utf8', (err, data) => {
            if (err) throw err;

            var distance = Number(data);

            if (distance <= 15) {
                isDetectFaceActive = true;
            } else {
                isDetectFaceActive = false;
            }
        });
    },100);
});

*/

function removeWhiteSigns(data) {
    return data.replace(/^\s+|\s+$/g, "");
}
