#!/usr/bin/env node

var io = require('socket.io-client');
var fs = require('fs')
var chokidar = require('chokidar');
var logger   = require('simple-logger');
var commandLineArgs = require('command-line-args');

var options = commandLineArgs([
        { name : 'host',alias:'h', type: String },
        { name : 'port',alias:'p', type: Number },
        { name : 'path',alias:'P', type: String },
]);

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

const ROBOT_AUTO_MODE   = 0;
const ROBOT_MANUAL_MODE = 1;

const GO_STRAIGHT_STATE = 0;
const STOP_STATE        = 1;

const STOP_DISTANCE = 30.0

const DEFAULT_SPEED = 75

const STOP = "stop";
const CW   = "cw";
const CCW  = "ccw";

const CAMERA_OFFSET   = 90;
const CAMERA_CENTER   = 0;

const MOTOR_MIN_SPEED = 0;
const MOTOR_MAX_SPEED = 100;

const MOTOR_SUSPEND_ACTIVE   = 1;
const MOTOR_SUSPEND_INACTIVE = 0;

const CAMERA_SUSPEND_ACTIVE   = 1;
const CAMERA_SUSPEND_INACTIVE = 0;

const CAMERA_ANGLE             = "camera_angle";
const CAMERA_SUSPEND           = "camera_suspend";
const GYRO_ANGLE               = "gyro_angle";
const VIDEO_SOCKET_ID          = "video_socket_id";
const LEFT_MOTOR_MODE          = "left_motor_mode";
const RIGHT_MOTOR_MODE         = "right_motor_mode";
const LEFT_MOTOR_SPEED         = "left_motor_speed";
const RIGHT_MOTOR_SPEED        = "right_motor_speed";
const MOTOR_SUSPEND            = "motor_suspend";
const DISTANCE_SENSOR_SONAR    = "distance_sensor_sonar";
const DISTANCE_SENSOR_INFRARED = "distance_sensor_infrared";
const LEFT_ENCODER_DISTANCE    = "left_encoder_distance";
const RIGHT_ENCODER_DISTANCE   = "right_encoder_distance";
const LEFT_ENCODER_RESET       = "left_encoder_reset";
const RIGHT_ENCODER_RESET      = "right_encoder_reset";
const ROBOT_NAME               = "robot_name";
const ROBOT_MODE               = "robot_mode";

var paths = new Array();

paths[CAMERA_ANGLE]             = PATH + "ddal/servo/camera_angle";
paths[CAMERA_SUSPEND]           = PATH + "ddal/servo/camera_suspend";
paths[GYRO_ANGLE]               = PATH + "ddal/gyro/angle";
paths[VIDEO_SOCKET_ID]          = PATH + "ddal/socket/video_socketId";
paths[LEFT_MOTOR_MODE]          = PATH + "ddal/motor/left_motor_mode";
paths[RIGHT_MOTOR_MODE]         = PATH + "ddal/motor/right_motor_mode";
paths[LEFT_MOTOR_SPEED]         = PATH + "ddal/motor/left_motor_speed";
paths[RIGHT_MOTOR_SPEED]        = PATH + "ddal/motor/right_motor_speed";
paths[MOTOR_SUSPEND]            = PATH + "ddal/motor/suspend";
paths[DISTANCE_SENSOR_SONAR]    = PATH + "ddal/distance_sensor/sonar";
paths[DISTANCE_SENSOR_INFRARED] = PATH + "ddal/distance_sensor/infrared";
paths[LEFT_ENCODER_DISTANCE]    = PATH + "ddal/encoder/left_encoder_distance";
paths[RIGHT_ENCODER_DISTANCE]   = PATH + "ddal/encoder/right_encoder_distance";
paths[LEFT_ENCODER_RESET]       = PATH + "ddal/encoder/left_encoder_reset";
paths[RIGHT_ENCODER_RESET]      = PATH + "ddal/encoder/right_encoder_reset";
paths[ROBOT_NAME]               = PATH + "ddal/robot_info/robot_name";

var init_data = {} 
var init_data_to_send = [LEFT_MOTOR_SPEED, RIGHT_MOTOR_SPEED, LEFT_ENCODER_DISTANCE,
    RIGHT_ENCODER_DISTANCE, CAMERA_ANGLE, DISTANCE_SENSOR_SONAR, DISTANCE_SENSOR_INFRARED,
    VIDEO_SOCKET_ID, ROBOT_NAME];

var SEND = init_data_to_send.length;
var count = 0;


function writeToFile(path, value) {
    fs.writeFile(path, value, (err) => {
          if (err) throw err;
          logger('Write  (' + value +') to ' + path);
    });
}

function checkIfComplete(data) {
        count++;
        if (SEND == count) {
            logger("[emit]:server:control:init_data" + JSON.stringify(data));
            conn.emit("server:control:init_data",data);
            count = 0;
        }
}

function removeWhiteSigns(data) {
    return data.replace(/^\s+|\s+$/g, "");
}

var listener = {
    video_socketId:{},
    right_encoder_distance:{},
    left_encoder_distance:{},
    distance_sensor_sonar:{},
    distance_sensor_infrared:{},
    gyro_angle:{}
};

listener.video_socketId = chokidar.watch(paths[VIDEO_SOCKET_ID], {
    persistent: true
});

listener.right_encoder_distance = chokidar.watch(paths[RIGHT_ENCODER_DISTANCE], {
    persistent: true
});

listener.left_encoder_distance = chokidar.watch(paths[LEFT_ENCODER_DISTANCE], {
    persistent: true
});

listener.distance_sensor_sonar = chokidar.watch(paths[DISTANCE_SENSOR_SONAR], {
    persistent: true
});

listener.distance_sensor_infrared = chokidar.watch(paths[DISTANCE_SENSOR_INFRARED], {
    persistent: true
});

listener.gyro_angle = chokidar.watch(paths[GYRO_ANGLE], {
    persistent: true
});

listener.video_socketId.on("change",(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[VIDEO_SOCKET_ID],"utf8", (err, data) => {
            if (err) throw err;

            logger("[emit] server:control:update_video_socket_id:" + data);
            conn.emit("server:control:update_video_socket_id",{video_socket_id:removeWhiteSigns(data)});
        });
    },100);
});

listener.left_encoder_distance.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[LEFT_ENCODER_DISTANCE],'utf8', (err, data) => {
            if (err) throw err;

            logger("[emit] server:control:update_left_encoder_distance:" + data);
            conn.emit("server:control:update_left_encoder_distance",{left_encoder_distance:removeWhiteSigns(data)});
        });
    },100);
});

listener.right_encoder_distance.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[RIGHT_ENCODER_DISTANCE],'utf8', (err, data) => {
            if (err) throw err;

            logger("[emit] server:control:update_right_encoder_distance:" + data);
            conn.emit("server:control:update_right_encoder_distance",{right_encoder_distance:removeWhiteSigns(data)});
        });
    },100);
});

listener.distance_sensor_sonar.on('change',(path,event) => {
    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[DISTANCE_SENSOR_SONAR],'utf8', (err, data) => {
            if (err) throw err;

            logger("[emit] server:control:update_distance_sensor_sonar:" + data);
            conn.emit("server:control:update_distance_sensor_sonar",{distance_sensor_sonar:removeWhiteSigns(data)});
        });
    },100);
});

listener.distance_sensor_infrared.on('change',(path,event) => {
    var distance;

    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[DISTANCE_SENSOR_INFRARED],'utf8', (err, data) => {
            if (err) throw err;

            logger("[emit] server:control:update_distance_sensor_infrared:" + data);
            conn.emit("server:control:update_distance_sensor_infrared",{distance_sensor_infrared:removeWhiteSigns(data)});

            distance = parseFloat(data);

            if (robot.getMode() == ROBOT_AUTO_MODE && distance <= STOP_DISTANCE) {
                robot.stop();
            }
        });
    },100);
});
listener.gyro_angle.on('change',(path,event) => {
    var distance;

    logger("Change event on " + path);

    setTimeout(function (path) {
        fs.readFile(paths[GYRO_ANGLE],'utf8', (err, data) => {
            if (err) throw err;
            logger("Gyro change  to : " + removeWhiteSigns(data));
        });
    },100);
});

var Robot = function (mode) {
    this.mode = mode;
    this.state = -1;

    function setState(val) {
        logger("Robot set state to: " + translateStateCode(val));
        this.state = val;
    }
};


Robot.prototype.getMode = function () {
    return this.mode;
}
Robot.prototype.setMode = function (val) {
    logger("Robot set mode to: " + translateModeCode(val));
    this.mode = val;
}

Robot.prototype.getState = function () {
    return this.state;
}
Robot.prototype.setState = function (val) {
    logger("Robot set state to: " + translateStateCode(val));
    this.state = val;
}

Robot.prototype.goStraight = function () {
    this.setState(GO_STRAIGHT_STATE);
    move(true, true);
}

Robot.prototype.goBack = function () {
    move(false, false);
}

Robot.prototype.turnLeft = function () {
    move(false, true);
}

Robot.prototype.turnRight = function () {
    move(true, false);
}

Robot.prototype.stop = function () {
    this.setState(STOP_STATE);
    setRightMotorMode(STOP);
    setLeftMotorMode(STOP);
}

Robot.prototype.turnOn = function () {
    setRightMotorSpeed(DEFAULT_SPEED);
    setLeftMotorSpeed(DEFAULT_SPEED);
    setLeftMotorMode(STOP);
    setRightMotorMode(STOP);
    setMotorSuspend(MOTOR_SUSPEND_INACTIVE);
    setCameraSuspend(CAMERA_SUSPEND_INACTIVE);
    setCameraAngle(CAMERA_CENTER);
}

Robot.prototype.turnOff = function () {
    setRightMotorSpeed(MOTOR_MIN_SPEED);
    setLeftMotorSpeed(MOTOR_MIN_SPEED);
    setLeftMotorMode(STOP);
    setRightMotorMode(STOP);
    setMotorSuspend(MOTOR_SUSPEND_ACTIVE);
    setCameraSuspend(CAMERA_SUSPEND_ACTIVE);
}

Robot.prototype.cameraAngleTo = function (val) {
    setCameraAngle(val);
}

Robot.prototype.updateSpeedBoth = function (left, right) {
    setLeftMotorSpeed(left);
    setRightMotorSpeed(right);
}

function setMotorSuspend(val) {
    writeToFile(paths[MOTOR_SUSPEND], val);
}

function setCameraSuspend(val) {
    writeToFile(paths[CAMERA_SUSPEND], val);
}

function setLeftMotorMode(val) {
    writeToFile(paths[LEFT_MOTOR_MODE], val);
}

function setRightMotorMode(val) {
    writeToFile(paths[RIGHT_MOTOR_MODE], val);
}

function setLeftMotorSpeed(val) {
    writeToFile(paths[LEFT_MOTOR_SPEED], val);
}

function setRightMotorSpeed(val) {
    writeToFile(paths[RIGHT_MOTOR_SPEED], val);
}

function setCameraAngle(val) {
    val = Number(val) + CAMERA_OFFSET;
    writeToFile(paths[CAMERA_ANGLE], val);   
}

function move(leftFwd, rightFwd) {
    if (rightFwd) {
        setRightMotorMode(CW);
    } else {
        setRightMotorMode(CCW);
    }

    if (leftFwd) {
        setLeftMotorMode(CCW);
    } else {
        setLeftMotorMode(CW);
    }
}

var robot = new Robot(ROBOT_MANUAL_MODE);

var conn = io(url);

conn.on('connect', function (data) {

    robot.turnOn();

    init_data[ROBOT_MODE] = robot.getMode();

    fs.readFile(paths[LEFT_MOTOR_SPEED],"utf8", (err, data) => {
        if (err) throw err;
        init_data[LEFT_MOTOR_SPEED] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths[RIGHT_MOTOR_SPEED],"utf8", (err, data) => {
        if (err) throw err;
        init_data[RIGHT_MOTOR_SPEED] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths[LEFT_ENCODER_DISTANCE],"utf8", (err, data) => {
        if (err) throw err;
        init_data[LEFT_ENCODER_DISTANCE] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths[RIGHT_ENCODER_DISTANCE],"utf8", (err, data) => {
        if (err) throw err;
        init_data[RIGHT_ENCODER_DISTANCE] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths[CAMERA_ANGLE],"utf8", (err, data) => {
        if (err) throw err;
        (Number(removeWhiteSigns(data)) - CAMERA_OFFSET)
        init_data[CAMERA_ANGLE] = (Number(removeWhiteSigns(data)) - CAMERA_OFFSET);
        checkIfComplete(init_data);
    });

    fs.readFile(paths[DISTANCE_SENSOR_SONAR],"utf8", (err, data) => {
        if (err) throw err;
        init_data[DISTANCE_SENSOR_SONAR] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });

    fs.readFile(paths[DISTANCE_SENSOR_INFRARED],"utf8", (err, data) => {
        if (err) throw err;
        init_data[DISTANCE_SENSOR_INFRARED] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });
    
    fs.readFile(paths[VIDEO_SOCKET_ID],"utf8", (err, data) => {
        if (err) throw err;
        init_data[VIDEO_SOCKET_ID] = "no connection";
        checkIfComplete(init_data);
    });

    fs.readFile(paths[ROBOT_NAME],"utf8", (err, data) => {
        if (err) throw err;
        init_data[ROBOT_NAME] = removeWhiteSigns(data);
        checkIfComplete(init_data);
    });
});
conn.on("robot::go_straight", function () {
    logger("[on] robot::go_straight");
    robot.goStraight();
});

conn.on("robot::go_back", function () {
    logger("[on] robot::go_back");
    robot.goBack();
});

conn.on("robot::turn_left", function () {
    logger("[on] robot::turn_left");
    robot.turnLeft();
});

conn.on("robot::turn_right", function () {
    logger("[on] robot::turn_right");
    robot.turnRight();
});

conn.on("robot::stop", function () {
    logger("[on] robot::stop");
    robot.stop();
});

conn.on("robot::change_camera_angle_to", function(data) {
    var value = data.camera_angle;
    logger("[on] robot::change_camera_angle_to:" + value);
    robot.cameraAngleTo(value);
});

conn.on("robot::update_speed_both", function(data) {
    var left = data.left_motor_speed;
    var right = data.right_motor_speed;
    logger("[on] robot::update_speed_both, left:" + left + ", right:" + right);
    robot.updateSpeedBoth(left,right);
});

conn.on("robot::automode", function() {
    logger("[on] robot::automode");
    robot.setMode(ROBOT_AUTO_MODE);
    robot.goStraight();
});

conn.on("robot::manualmode", function() {
    logger("[on] robot::manualmode");
    robot.setMode(ROBOT_MANUAL_MODE);
    robot.stop();
});

/* Error handling */
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
conn.on('disconnect', function () {
    logger("Server was disconnected");
    robot.turnOff();
});

function translateModeCode(code) {
    switch (code) {
        case 0:
            return "auto mode";
        case 1:
            return "manual mode";
        default:
            return "undefined mode";
    }
}

function translateStateCode(code) {
    switch (code) {
        case GO_STRAIGHT_STATE:
            return "go straight";
        case STOP_STATE:
            return "stop";
        default:
            return "undefined state";
    }
}

function getGyroAngleSync() {
    var data = fs.readFileSync(paths[GYRO_ANGLE],'utf8');
    return removeWhiteSigns(data);
}
