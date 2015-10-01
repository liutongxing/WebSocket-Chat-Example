var socket = io();
var messagesDiv = $('#messages');

$('#logbutton').click(function () {
    $('#log').toggle();
});

$('form').submit(function () {
    var message = $('#m').val();
    if (/^\/nick/.test(message)) {
        localStorage.setItem('nickname', message.substr(6));
        socket.emit('change nick', message.substr(6));
    } else if (/^\/list/.test(message)) {
        socket.emit('list users');
    } else if (/^\/debug/.test(message)) {
        $('#log').toggle();
    } else {
        socket.emit('chat-message', message);
    }
    $('#m').val('');
    return false;
});
socket.on('init-ping', function () {
    var init = {};
    init.nick = localStorage.getItem('nickname');
    socket.emit('init-pong', init);
});
socket.on('chat-message', function (msg) {
    devLog('chat-message', msg);
    addLine('message', msg);
});
socket.on('info', function (msg) {
    devLog('info', msg);
    addLine('info', msg);
});
socket.on('notification', function (msg) {
    devLog('notification', msg);
    addLine('notification', msg);
});
socket.on('warn', function (msg) {
    devLog('warn', msg);
    addLine('warn', msg);
});
socket.on('update', function (msg) {
    devLog('update', msg);
    if (msg.users) {
        var users_new = $('<ul>');
        users_new = users_new.append($('<div class="header">').text('Users Online : ' + msg.users.length));
        msg.users.forEach(function (user) {
            users_new = users_new.append($('<li>').text(user));
        });
        $('#users').html(users_new);
    }
});
addLine = function (type, msg) {
    messagesDiv.append($('<li>').addClass(type).text(msg));
    messagesDiv[0].scrollIntoView(false);
}

// should keep log as an object that allows filtering (checkbox for different types)
var logDiv = document.getElementById("log");
devLog = function (type, msg) {
    $('#log > ul').append($('<li>')
        .append($('<span>').addClass('type').text(type))
        .append($('<span>').addClass('msg').text(JSON.stringify(msg)))
    )
    logDiv.scrollTop = logDiv.scrollHeight;
}