var state = {
    connected: false,
    started: false, 
}
// use two canvases - one for user bodies, other for text
var canvas;
var context;
var lineCanvas;
var lineContext;
var width = 800;
var height = 600;
var prevUsers = [];

/**
 * Show status message
 * @param string message
 */
function status(message) {
    var $status = $('.status');
    $status.append(message + '<br/>');
    $status.scrollTop($status[0].scrollHeight);
}

var socket = new WebSocket("ws://localhost:8888");
/**
 * Send object to socket
 * @param object data
 */
socket.sendData = function(data) {
    this.send(JSON.stringify(data));
}

/**
 * Send command with data to socket
 * @param string command
 * @param object [data]
 */
socket.command = function(command, data) {
    data = data || {};
    this.sendData({
        command: command,
        data: data
    })
}

/**
 * On connection get userlist
 */
socket.onopen = function() {
    status("Connected to server.");
    socket.command('list');
};

/**
 * On closing connection show reason
 */
socket.onclose = function(event) {
    if (event.wasClean) {
        status('Connection closed');
    } else {
        status('Connection failed');
    }
    status('Code: ' + event.code + ' reason: ' + event.reason);
};

/**
 * Process a message from server
 * @param object message
 */
function process(message) {
    var handlers = {
        login: function(success, data){
            if (success) {
                state.connected = true;
                $('.disconnect').show();
                $('.connect').hide();
            } else {
                status(data.message);
            }
        },
        logout: function(success, data){
            if (success) {
                console.log(data.message);
                state.connected = false;
                $('.disconnect').hide();
                $('.connect').show();
            } else {
                status(data.message);
            }
        },
        list: function(success, data){
            if (success) {
                var html = "";
                $.each(data.users, function(ignore, user){
                    console.log(user);
                    html += '<li>' + user.name + '</li>'
                });
                $('.users ul').html(html);
            } else {
                console.log('error getting userlist');
            }
        },
        start: function(success, data){
            if (success) {
                clearField();
                draw(data.users);
            }
        },
        pause: function(success, data){
            if (success) {
                clearField();
                draw(data.users);
                drawTime(data.time);
            }
        },
        game: function(success, data){
            if (success) {
                if (!state.started) {
                    clearField();
                    state.started = true;
                }
                draw(data.users);
            }
        },
        stop: function(success, data){
            if (success) {
                win(data.winner.name);
                state.started = false;
            }
        },
    }
    if (message.command && handlers.hasOwnProperty(message.command)) {
        handlers[message.command](message.success, message.data);
        console.log(message.command);
    } else {
        console.log('Invalid command ' + message.command);
    }
}

/**
 * On every message process it
 */
socket.onmessage = function(event) {
    //console.log("Received data " + event.data);
    try {
        process(JSON.parse(event.data));
    } catch(e) {
        console.log(e);
    }
};

/**
 * If error show it
 */
socket.onerror = function(error) {
    status("Error: " + error.message);
};

/**
 * Logout before closing page
 */
window.onbeforeunload = function(){
    socket.command('logout', {
        user: $('#connect').find('input[name=user]').val(),
    });
}

/**
 * Draw a point by coordinates and color
 * 
 * @param int x
 * @param int y
 * @param string color
 */
function drawPoint(x, y, color) {
    lineContext.fillStyle = color;
    lineContext.fillRect(x, y, 1, 1);
}

/**
 * Draw a user's 'body'
 * 
 * @param object user
 */
function drawUserBody(user) {
    drawPoint(user.x, user.y, user.color);
}

/**
 * Draw a user's name
 * 
 * @param object user
 */
function drawUserName(user) {
    context.fillText(user.name, Math.min(Math.max(user.x - 10, 0), width - 10), Math.min(Math.max(user.y - 12, 0), height - 12));
}

/**
 * Draw all users bodies
 * 
 * @param array users
 */
function drawUserBodies(users) {
    $.each(users, function(ignore, user){
        drawUserBody(user);
    });
}

/**
 * Draw all users names
 * 
 * @param array users
 */
function drawUserNames(users) {
    $.each(users, function(ignore, user){
        drawUserName(user);
    });
}

/**
 * Draw all users bodies and then their names in 'xor' mode
 * 
 * @param array users
 */
function draw(users) {
    drawUserBodies(users);
    
    context.globalCompositeOperation = "source-over";
    context.drawImage(lineCanvas, 0, 0);
    
    context.globalCompositeOperation = "xor";
    drawUserNames(users);
}

/**
 * Show winning text
 * 
 * @param name - username
 */
function win(name) {
    context.fillText(name + " wins!", width / 2, height / 2);
}

/**
 * Drow countdown
 * @param int time
 */
function drawTime(time) {
    context.fillText(time - 1 +'', width / 2, height / 2);
}

/**
 * Clear canvases
 */
function clearField() {
    context.fillStyle = "blue";
    lineContext.fillStyle = "blue";
    context.globalCompositeOperation = "source-over";
    context.fillRect(0, 0, canvas.width, canvas.height);
    lineContext.fillRect(0, 0, canvas.width, canvas.height);

    prevUsers = false;
}

$(function(){
    
    $('#connect').on('submit', function(){
        if (!state.connected) {
            socket.command('login', {
                user: $(this).find('input[name=user]').val(),
            });
        } else {
            socket.command('logout', {
                user: $(this).find('input[name=user]').val(),
            });
        }
        return false;
    })
    
    $(document).on('keydown', function(event){
        if (event.target.tagName == 'input'
            || !state.started
        ) {
            return
        };
        
        if (event.keyCode == 55 || event.keyCode == 103) {
            socket.command('turn', { user: $(this).find('input[name=user]').val(), direction: 'left' });
        } else if (event.keyCode == 56 || event.keyCode == 104) {
            socket.command('turn', { user: $(this).find('input[name=user]').val(), direction: 'right' });
        }  
    })
    
    canvas = $('canvas')[0];
    context = canvas.getContext("2d");
    context.font = "10px";
    
    lineCanvas = document.createElement('canvas');
    lineCanvas.width = width;
    lineCanvas.height = height;
    lineContext = lineCanvas.getContext('2d');
    
    clearField();
});

/* @TODO
 * cache users
 * what to do if users are disconnected
 * don't let new users get into current game
 * show users stats
 * show if user plays
 * 
*/
