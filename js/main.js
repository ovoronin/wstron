var state = {
    connected: false,
    started: false, 
}
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
 * Draw a user's 'head' at x, y
 * 
 * @param object user
 * @param int x
 * @param int y
 */
function drawUserBody(user) {
    drawPoint(user.x, user.y, user.color);
}

function drawUserName(user) {
    context.drawString(user.name, tahoma8, Math.min(Math.max(user.x - 10, 0), width - 10), Math.min(Math.max(user.y - 12, 0), height - 12));
}

/**
 * Draw users
 * 
 * @param users
 */
function drawUserBodies(users) {
    $.each(users, function(ignore, user){
        drawUserBody(user);
    });
}

function drawUserNames(users) {
    $.each(users, function(ignore, user){
        drawUserName(user);
    });
}

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
    context.drawString(name + " wins!", tahoma8, width / 2, height / 2);
}

/**
 * Drow countdown
 * @param int time
 */
var prevTime;
function drawTime(time) {
    context.strokeStyle = "#000";
    context.fillStyle = "#000"

    if (prevTime !== undefined) {
        context.drawString(prevTime+'', tahoma8, width / 2, height / 2);
    }
    context.drawString(time+'', tahoma8, width / 2, height / 2);

    if (time > 1) {
        prevTime = time
    } else {
        prevTime = undefined;
    }
}

/**
 * Clear canvas
 */
function clearField() {
    context.fillStyle = "blue";
    lineContext.fillStyle = "blue";
    context.fillRect(0, 0, canvas.width, canvas.height);
    lineContext.fillRect(0, 0, canvas.width, canvas.height);

    prevUsers = false;
}

// http://www.benjoffe.com/code/dev/canvas_fonts
var tahoma8 = new Image();
tahoma8.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAikAAAANCAYAAABsMf4XAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wsGDhMPhskbngAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAQJSURBVHja7VzbjiUhCJw+6f//ZeepE2O4FIgtngPJZnd6vAJiUeperbW/kpKSkpKSkpJs8ikVlJSUlJSUlBwFUq7rclMsSN3ruppWzjIGquzMHEpKSkpKcsVUrv/n++z4nn2pb2/8OVI/kfrUxij1FaW/FfO9dzlaa+2KqD/bVqbFf8o8Hkfrxzs63zgX6vdSHcqZqTrIOCjdPt/68r1PSfX7utw8qTH1/VHtUXPw6jjaNqguET1Zy0nfJV/Q9MKtO0SPXD+UD0ltIeWt49HmJM1B829LPJDqcr+n2pJ8Zvy3Zdyc9HUl+2TdPyJ0EAlGRn1ax3b/HSiUE5XksgsKJKXAhtSZBXrUopEC0+rFr23oqI699SgdZF1jyEasbW5oeQRozfgpNxfveFBAYLHtmG2P47CAGm0OlP9yOvklFmv3vFfGdU4+FKXFUV/Sd28bVDmt3ZGK0ygljsLT+kbmKpUfFzUyL452s3zndGVtjxtja+3iMtmZhYW2uWsBo31oAZWbp6VsRL2MoIPSG7JBeQEqCiw8rIC3bKQvj5tKv55HH5Fi1mgPrz44u3qYgh2+T7WtMWxZQQc1bsluHHBcHWduCfVYKG4qq5CQspfu5tC1ZngK/Vnn6invyV5XLi6UbtOyRAvFF00ZascXWlunZjFvBN1ZmpzyMeo754seOniVbZDjPG1D1vwXWYcR9tEYJE+MGMfnAV99X1Rb/e8iYqUUB4qV5/WlgXf0mM7Sz1P3jgjgKzeHb9lIvMazBhLpd9qmgABQC7CZtYUnq0UzhNV+qQV677nxTNbG1Yu22w59vhVLuGSHYholJkBK0JCf32bKJPZCO07TsnQtgZwBEqPfr/Cf1ce/0nw4cICAx0hGz2JDDUCPdW7kbDWrAXcHslmdoBnIThTNMWSZN7UVl92y+Ja3/9MuAHoC3I5kZyfAi4zb3BGxJaGxbDxvrTdLcpIVnGtMFAJuZ4Epmhiu6PPzdgB6E/Fnl5kNR6PJLa8iLBfxnmwEzUq8584Z7W7tw0Plo8eX2rgk+63UE8riIcepnrs4qwDKG09LvfNBLiaO9wfGOwbU3x7WYoU9ov2T+xM9RokFyZIQoPqS7n/OHslR9fpvtxQMONqcotCQJ6Ma9Z0NqEjjR3SDUpAUgozWieeJmvVoQXt2pmX2yNPYaLuPWaM2Z+pFQ2Qm5r2DYKk3ZsSzOs5y+Y8LeNoa1thkaj1675JEtSNlr9xaj9qIrcB51oetx6arGa0Ilue0O26e45yoOV4Z/1v86Nvyu8Z3iiP+6pO+b5WyZ4kVzJ3sW5EgBX09hmzWnmfhK3Vwaly4My6izAClpOSErCf7faeSPZnwN/t71D0W7on2DKixgkir3aJ1kEn+AbAlM5ustbOMAAAAAElFTkSuQmCC';
tahoma8.c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789!@#$%^&*()-=[]\\;\',./_+{}|:"<>?`~';
tahoma8.w=[6,6,5,6,6,4,6,6,2,3,5,2,8,6,6,6,6,4,5,4,6,6,8,6,6,5,7,6,7,7,6,6,7,7,4,5,6,5,8,7,8,6,8,7,6,6,7,6,10,6,6,6,3,6,6,6,6,6,6,6,6,6,6,4,10,8,6,11,8,7,6,4,4,4,8,4,4,4,4,2,4,4,4,6,8,5,5,4,4,4,8,8,5,6,8];
tahoma8.h=13;

/**
 * Draw string on canvas with image font
 * 
 * @param string string
 * @param Image font
 * @param int x
 * @param int y
 */
CanvasRenderingContext2D.prototype.drawString = function(string, font, x, y){
    y = Math.round(y);
    var startX = x = Math.round(x),
        t,
        i,
        j;
    
    if(!font.f){
        font.f = [ t=0 ];
        i = 0;
        j = font.w.length;
        while (++i < j) {
            font.f[i] = t += font.w[i-1];
        }
    }
    
    string = string.split('');
    i = 0;
    j = string.length;
    
    while (i < j) {
        if ((t = font.c.indexOf(string[i++])) >= 0) {
            this.drawImage(font, font.f[t], 0, font.w[t], font.height, x, y, font.w[t], font.height);
            x += font.w[t];
        } else { 
            if (string[i-1]=='\n') {
                x = startX;
                y += font.h;
            }
        };
    }
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
    context.globalCompositeOperation = "xor";
    
    lineCanvas = document.createElement('canvas');
    lineCanvas.width = width;
    lineCanvas.height = height;
    lineContext = lineCanvas.getContext('2d');
    
    clearField();
});

/* @TODO
 * remove custom font, use common techniques
 * cache users
 * what to do if users are disconnected
 * don't let new users get into current game
 * show users stats
 * show if user plays
 * 
*/
