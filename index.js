var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require("underscore");

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

var updateTime = 500,
    users = [],
    guests = 1;
var userChange = false;

io.on('connection', function (socket) {
    var userRef;
    socket.emit('init-ping');

    socket.on('init-pong', function (init) {
        var userName = init.nick || generateUser();

        if (userName == 'Raven' && init.ip != '81.82.199.31') {
            socket.emit('info', '\'Raven\' is a reserved nickname.');
            userName = generateUser();
        }

        while (_.find(users, function (user) {
                return user.name == userName;
            })) {
            userName += '*';
        }
        userRef = users.push({
            name: userName,
            ip: init.ip,
            color: get_color(userName)
        }) - 1;
        userChange = true;
        socket.broadcast.emit('notification', '> User ' + getName(userRef) + ' connected');
        socket.emit('info', 'Welcome ' + (init.nick ? 'back,' : '') + ' ' + getName(userRef));
        socket.emit('info', 'This is a WebSocket chat demo. Available commands are: /nick <username>, /list, /debug, /me');
    });

    socket.on('chat-message', function (msg) {
        io.emit('chat-message', {
            user: getUser(userRef),
            message: msg
        });
    });

    socket.on('emote', function (msg) {
        io.emit('emote', getName(userRef) + " " + msg);
    });

    socket.on('change nick', function (nick) {
        if (!getRef(nick)) {
            var userNameOld = getName(userRef);
            changeNick(getName(userRef), nick);
            userChange = true;
            io.emit('warn', '> User ' + userNameOld + ' has been renamed to ' + getName(userRef));
        } else {
            socket.emit('warn', '> Username ' + nick + ' is already in use!');
        }
    });

    socket.on('disconnect', function () {
        socket.broadcast.emit('notification', '> User ' + getName(userRef) + ' disconnected..');
        users = _.reject(users, function (user) {
            return user.name === getName(userRef);
        });
        userChange = true;
    });

    socket.on('list users', function () {
        socket.emit('info', '> Users online (' + users.length + ') : ' + JSON.stringify(users));
    });
});

//send something to all users every second;
(function heartbeat() {
    var update = {};
    // Populate Update object
    if (userChange) {
        update.users = users;
        userChange = false;
    }
    // Emit if update contains data
    if (Object.keys(update).length > 0) {
        io.emit('update', update);
    }
    // Call self
    setTimeout(heartbeat, updateTime);
})();

//------
function generateUser() {
    // return Array(N+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, N);
    return 'Guest' + guests++;
}

function changeNick(oldNick, newNick) {
    var oldNickIndex = _.findIndex(users, function (user) {
        return user.name == oldNick;
    });
    users[oldNickIndex].name = newNick;
    users[oldNickIndex].color = get_color(newNick);

}

function getName(ref) {
    return users[ref] ? users[ref].name : 'unknown';
}

function getUser(ref) {
    return users[ref];
}

function getRef(userName) {
    return _.find(users, function (user) {
        return user.name == userName;
    });
}

// color nicks borrowed from https://github.com/avidal/irccloud-colornicks/blob/master/src/colornicks.user.js
function get_color(nick) {
    function clean_nick(nick) {
        return nick.toLowerCase().replace(/[`_]+$/, '').replace(/|.*$/, '');
    }

    function hash(nick) {
        var cleaned = clean_nick(nick);
        var h = 0;
        for (var i = 0; i < cleaned.length; i++) {
            h = cleaned.charCodeAt(i) + (h << 6) + (h << 16) - h;
        }
        return h;
    }

    var nickhash = hash(nick);
    // get a positive value for the hue
    var deg = nickhash % 360;
    var h = deg < 0 ? 360 + deg : deg;
    // default L is 50
    var l = 50;
    // half of the hues are too light, for those we
    // decrease lightness
    if (h >= 30 && h <= 210) {
        l = 30;
    }
    // keep saturation above 20
    var s = 20 + Math.abs(nickhash) % 80;
    return "hsl(" + h + "," + s + "%," + l + "%)";
}
//------

http.listen(80, function () {
    console.log('listening...');
});

//// sending to sender-client only
//socket.emit('message', "this is a test");

// sending to all clients, include sender
//io.emit('message', "this is a test");

//// sending to all clients except sender
//socket.broadcast.emit('message', "this is a test");

//// sending to all clients in 'game' room(channel) except sender
//socket.broadcast.to('game').emit('message', 'nice game');

//// sending to all clients in 'game' room(channel), include sender
//io.in('game').emit('message', 'cool game');

//// sending to sender client, only if they are in 'game' room(channel)
//socket.to('game').emit('message', 'enjoy the game');

//// sending to all clients in namespace 'myNamespace', include sender
//io.of('myNamespace').emit('message', 'gg');

//// sending to individual socketid
//socket.broadcast.to(socketid).emit('message', 'for your eyes only');
