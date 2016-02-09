var _ = require('lodash');
var WebSocketServer = require('ws').Server;
var WebSocket = require('ws');
var server = new WebSocketServer({ port: 8888 });

var users = [];
var width = 800;
var height = 600;
var field;
var ingame = false;
var timer;

/* ================================== users =================================== */

/**
 * Get user by name
 * 
 * @param {String} name - username
 * @return User || undefined
 */
function user(name) {
    var index = _.findIndex(users, function(u) {
        return u.name == name;
    });
    if (index >= 0) {
        return users[index];
    } else {
        return undefined;
    }
}

/**
 * Remove user by name and broadcast userlist
 * @param {string} name - username
 */
function removeUser(name) {
    _.remove(users, function(u) {
        return u.name == name;
    });
    broadcastUsers();
}

/**
 * Add user with name and broadcast userlist
 * @param {string} name - username
 */
function addUser(name) {
    users.push({name: name});
    broadcastUsers();
}

/**
 * Broadcast userlist to all users
 */
function broadcastUsers() {
    server.broadcast('list', {users:users});
}



/**
 * Broadcast game progress
 */
function broadcastProgress() {
    server.broadcast('game', {
        users: users,
        ingame: ingame
    });
}

/**
 * Place users randomly and set their colors
 */
function placeUsers() {
    _.each(users, function(user){
        do {
            var x = rnd(width-200) + 100;
            var y = rnd(height-200) + 100;
            var found = _.findIndex(users, function(u) {
                return (u.name != user.name) && distance(x, y, u.x, u.y) < 900;
            })
        } while (found >= 0);
        user.x = x;
        user.y = y;
        user.color = rainbow(50, rnd(50));
        user.direction = rnd(4);
        user.lost = false;
    });
}

/* ================================== gameplay =================================== */

/**
 * Create new empty field
 */
function clearField(){
    if (field) {
        delete field;
    }
    field = new Array(width * height);
}

/**
 * Get offset in field array by coordinates
 * @param int x
 * @param int y
 * @returns int
 */
function getFieldOffset(x, y) {
    return x + y * width;
}

/**
 * Get field element by coordinates
 * @param int x
 * @param int y
 * @returns element
 */
function getField(x, y) {
    return field[getFieldOffset(x, y)];
}

/**
 * Set field element by coordinates
 * @param int x
 * @param int y
 * @param element el
 */
function setField(x, y, el) {
    field[getFieldOffset(x, y)] = el;
}

/**
 * Move user according to its direction
 * 
 * @param object user
 */
function moveUser(user) {
    if (user.lost) {
        return;
    }
    
    var deltaX = [1, 0, -1 , 0];
    var deltaY = [0, 1, 0 , -1];
    user.x += deltaX[user.direction];
    user.y += deltaY[user.direction];
    if (getField(user.x, user.y) || user.x < 0 || user.x > width || user.y < 0 || user.y > height) {
        user.lost = true;
    } else {
        setField(user.x, user.y, 1);
    }
}

/**
 * Pause game, send 'pause' message every second
 * 
 * @param int seconds - pause value
 */
function pause(seconds){
    var timer = setInterval(function(){
        broadcastPause(seconds);
        seconds--;
        if (seconds == 0) {
            clearInterval(timer);
        };
    }, 1000);
}

/**
 * Start game
 */
function start(){
    if (ingame) {
        return;
    }
    ingame = true;
    clearField();
    placeUsers();
    broadcastStart();
    pause(10);

    setTimeout(function(){
        timer = setInterval(game, 50);
    }, 10000)
}

/**
 * One step of the game
 * Control losing/winning
 * Broadcast game progress
 */
function game(){
    var remaining = users.length;
    
    _.each(users, function(user){
        moveUser(user);
        if (user.lost) {
            remaining--;
        }
    })
    if (remaining <= 1) {
        var user = _.findIndex(users, function(u) {
            return !u.lost;
        });
        if (user >= 0) {
            stop(users[user]);
        } else {
            stop()
        }
    } else {
        broadcastProgress();
    }
};

/**
 * Stop the game, broadcast the result
 * @param object user - the winner
 */
function stop(user){
    if (timer) {
        clearInterval(timer);
        ingame = false;
        user = user || { name: "nobody" }
        broadcastStop(user);
        
        // start new game
        setTimeout(function(){
            if (users.length >= 2) {
                start();
            }
        }, 10000)

    }
}

/* ================================== web sockets =================================== */
/**
 * Broadcast start game event and userlist
 */
function broadcastStart(){
    server.broadcast('start', {
        users: users
    });
}

/**
 * Broadcast stop game event
 * @param object user - the winner
 */
function broadcastStop(user){
    server.broadcast('stop', {
        winner: user
    });
}

/**
 * Broadcast game pause event
 * @param int seconds - countdown
 */
function broadcastPause(seconds){
    server.broadcast('pause', {
        time: seconds
    });
}

/**
 * Broadcast command and data to all users
 * @param string command
 * @param object data
 */
server.broadcast = function broadcast(command, data) {
    server.clients.forEach(function each(client) {
        client.success(command, data);
    });
};

/**
 * Send data to socket
 * @param object data
 */
WebSocket.prototype.sendData = function(data) {
    this.send(JSON.stringify(data));
}

/**
 * Send command and data with success = true
 * @param string command
 * @param string data
 */
WebSocket.prototype.success = function(command, data) {
    this.sendData({
        command: command,
        success: true,
        data: data
    })
}

/**
 * Send command and data with success = false
 * @param string command
 * @param string data
 */
WebSocket.prototype.error = function(command, data) {
    this.sendData({
        command: command,
        success: false,
        data: data
    })
}

/* ================================== utils =================================== */

/**
 * Get random number from 0 to max-1
 * 
 * @param int max
 */
function rnd(max) {
    return Math.floor(Math.random()*max);
}

/**
 * Calculate distance between two points
 * 
 * @param int x1
 * @param int y1
 * @param int x2
 * @param int y2
 * @returns {Number} distance squared
 */
function distance(x1, y1, x2, y2) {
    return x1 * y1 + x2 * y2;
}

/**
 * Generate vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
 * Adam Cole, 2011-Sept-14
 * 
 * @param int numOfSteps
 * @param int step
 * @returns {String} - color in CSS format
 */
function rainbow(numOfSteps, step) {
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

/* ================================== server =================================== */

// Handle incoming connections
server.on('connection', function connection(ws) {

    /**
     * Process incoming message from user
     * @param object message
     */
    function process(message) {
        var handlers = {
            login: function(data){
                if (!user(data.user)) {
                    ws.success('login', {
                        message: 'user ' + data.user + ' logged in!',
                    });
                    addUser(data.user);
                    if (users.length >= 2) {
                        start();
                    }
                } else if (ingame) {
                    ws.error('login', {
                        message: 'wait for game end!',
                    });
                } else {
                    ws.error('login', {
                        message: 'username ' + data.user + ' is not available!',
                    });
                }
            },
            logout: function(data){
                removeUser(data.user);
                ws.success('logout', {
                    message: 'user ' + data.user + ' logged out!',
                });
            },
            list: function(data){
                ws.success('list', {
                    message: '',
                    users: users,
                });
            },
            turn: function(data) {
                var u = user(data.user);
                if (!ingame || !u) {
                    return;
                }

                u.direction += (data.direction == 'right') ? 1 : -1;
                u.direction = (u.direction + 4) % 4;
            }
        }
        
        if (message.command && handlers.hasOwnProperty(message.command)) {
            handlers[message.command](message.data);
        } else {
            console.log('Invalid command ' + message.command);
        }
    }
    
    ws.on('message', function incoming(message) {
        console.log(message);
        message = JSON.parse(message);
        process(message);
    });

    ws.success('connect', {
        message: "Connected",
    });
});
