var io = require('socket.io-client');
var chokidar = require('chokidar');
var fs = require('fs')
var commandLineArgs = require('command-line-args');
var logger = require('simple-logger');

var options = commandLineArgs([
        { name : 'filenames',alias:'f',multiple:true, type: String },
        { name : 'host',alias:'h', type: String },
        { name : 'port',alias:'p', type: Number },
        { name : 'path',alias:'P', type: String },
]);

/*
var watcher = chokidar.watch(options.filenames, {
    ignored:['/[\/\\]\./','dev/ddal/socket/socketid'],
    persistent: true
});
*/



var PORT = options.port;
var HOST = options.host;
var PATH = options.path

if (!PORT)
    PORT = 1234;

if (!HOST)
    HOST = 'localhost';

if (!PATH)
    PATH = '';

var url = 'http://'+ HOST + ':' + PORT+'/control';

var conn = io(url);

var init_data = {
    motor:{
        motor_a_mode:String,
        motor_b_mode:String,
        motor_a_speed:Number,
        motor_b_speed:Number,
    },
    encoder:{
        distance_a:Number,
        distance_b:Number,
        reset:Number
    },
    servo:{
        angle:Number
    },
    distance_sensor:{
        sonar:String,
        infrared:String
    },
    video_socketId:String,
    watchers:Number
}

var SEND = 10;
var count = 0;

var paths = new Array();

paths["motor_a_mode"]  = PATH + "dev/ddal/motor/motor_a_mode";
paths["motor_b_mode"]  = PATH + "dev/ddal/motor/motor_b_mode";
paths["motor_a_speed"] = PATH + "dev/ddal/motor/motor_a_speed";
paths["motor_b_speed"] = PATH + "dev/ddal/motor/motor_b_speed";
paths["encoder_distance_a"]    = PATH + "dev/ddal/encoder/distance_a";
paths["encoder_distance_b"]    = PATH + "dev/ddal/encoder/distance_b";
paths["reset"]    = PATH + "dev/ddal/encoder/reset";
paths["angle"]    = PATH + "dev/ddal/servo/angle";
paths['video_socketId'] = PATH + "dev/ddal/socket/video_socketId";
paths["distance_sensor_sonar"]    = PATH + "dev/ddal/distance_sensor/sonar";
paths["distance_sensor_infrared"] = PATH + "dev/ddal/distance_sensor/infrared";




conn.on('connect', function (data) {
    logger("Connected to server");

    fs.readFile(paths["motor_a_mode"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.motor.motor_a_mode = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["motor_b_mode"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.motor.motor_b_mode = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["motor_a_speed"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.motor.motor_a_speed = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["motor_b_speed"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.motor.motor_b_speed = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["encoder_distance_a"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.encoder.distance_a = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["encoder_distance_b"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.encoder.distance_b = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["reset"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.encoder.reset = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["angle"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.servo.angle = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["distance_sensor_sonar"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.distance_sensor.sonar = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths["distance_sensor_infrared"],"utf8", (err, data) => {
        if (err) throw err;
        init_data.distance_sensor.infrared = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });
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

conn.on("robot:update_speed", function(data) {
    logger("[on] robot:update_speed");
    writeToFile(paths["motor_a_speed"], data.motor_a_speed);
    writeToFile(paths["motor_b_speed"], data.motor_b_speed);
});

var SERVO_UPDATE = "robot:update_servo_angle";
conn.on(SERVO_UPDATE, function(data) {
    logger("[on] " + SERVO_UPDATE);
    writeToFile(paths["angle"], data.servo_angle);
});

function writeToFile(path, value) {
    fs.writeFile(path, value, (err) => {
          if (err) throw err;
          logger('Write  (' + value +') to ' + path);
    });
}

function checkIfComplete(data) {
        count++;
        if (SEND == count) {
            data.video_socketId = 'no connection';
            data.watchers = 0;
            logger("Send init data:\n" + JSON.stringify(data));
            conn.emit('server:init',data);
            count = 0;
        }
}

function removeWhiteSigns(data) {
    return data.replace(/^\s+|\s+$/g, "");
}

/*
watcher.on('change',(path,event) => {
    fs.readFile(path,"utf8", (err, data) => {
        if (err) throw err;
        data = removeWhiteSigns(data);
        conn.emit('sendToServer',{path:path,msg:data});
        logger("Sent to server " + data + " from " + path);
    });

});
*/


var listener = {
    video_socketId:{},
    encoder_distance_a:{},
    encoder_distance_b:{},
    distance_sensor_sonar:{},
    distance_sensor_infrared:{}
};

listener.video_socketId = chokidar.watch(paths['video_socketId'], {
    persistent: true
});

listener.encoder_distance_a = chokidar.watch(paths['encoder_distance_a'], {
    persistent: true
});

listener.encoder_distance_b = chokidar.watch(paths['encoder_distance_b'], {
    persistent: true
});

listener.distance_sensor_sonar = chokidar.watch(paths['distance_sensor_sonar'], {
    persistent: true
});

listener.distance_sensor_infrared = chokidar.watch(paths['distance_sensor_infrared'], {
    persistent: true
});

listener.video_socketId.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths['video_socketId'],'utf8', (err, data) => {
            if (err) throw err;

            logger("Control:[emit] server:update_video_socketId " + data);
            conn.emit('server:update_video_socketId',{video_socketId:removeWhiteSigns(data)});
        });
    },100);
});

listener.encoder_distance_a.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths['encoder_distance_a'],'utf8', (err, data) => {
            if (err) throw err;

            logger("Control:[emit] server:update_encoder_distance_a: " + data);
            conn.emit('server:update_encoder_distance_a',{encoder_distance_a:removeWhiteSigns(data)});
        });
    },100);
});

listener.encoder_distance_b.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths['encoder_distance_b'],'utf8', (err, data) => {
            if (err) throw err;

            logger("Control:[emit] server:update_encoder_distance_b: " + data);
            conn.emit('server:update_encoder_distance_b',{encoder_distance_b:removeWhiteSigns(data)});
        });
    },100);
});

listener.distance_sensor_sonar.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths['distance_sensor_sonar'],'utf8', (err, data) => {
            if (err) throw err;

            logger("Control:[emit] server:update_distance_sensor_sonar: " + data);
            conn.emit('server:update_distance_sensor_sonar',{distance_sensor_sonar:removeWhiteSigns(data)});
        });
    },100);
});

listener.distance_sensor_infrared.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths['distance_sensor_infrared'],'utf8', (err, data) => {
            if (err) throw err;

            logger("Control:[emit] server:update_distance_sensor_infrared: " + data);
            conn.emit('server:update_distance_sensor_infrared',{distance_sensor_infrared:removeWhiteSigns(data)});
        });
    },100);
});
