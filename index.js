var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('underscore');

app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

// TODO
// - change active users to include username, socket object, user color, authority(?), ..
// - add authorities (admin commands : raname other user, kick user, ..)
// - private messaging
// - "{user is typing}" is typing"
// - (append own messages instead of receiving from broadcast?)

var updateTime = 500;
var users = [], guests = 1;
var userChange = false;
io.on('connection', function(socket){
	var userName;
	socket.emit('init-ping');
	
	socket.on('init-pong', function(init){
		userName = init.nick || generateUser();
		
		if(userName == 'Raven' && init.ip != '81.82.199.31') {
			socket.emit('info', '\'Raven\' is a reserved nickname.'); 
			userName = generateUser();
		}
		
		while(_.find(users, function(user){return user.name == userName;})){
			userName+='*';
		}
		users.push({name : userName, ip: init.ip});
		userChange = true;
		socket.broadcast.emit('notification', '> User '+userName+' connected');
		socket.emit('info', 'Welcome '+(init.nick ? 'back,':'')+' '+userName); 
		socket.emit('info', 'This is a WebSocket chat demo. Available commands are: /nick <username>, /list, /debug, /me'); 
	});
	
	/*
	var updateTimer = (function(){
		//send something to user every second;
		setTimeout(arguments.callee, updateTime); 
	})();
	*/

	socket.on('chat-message', function(msg){
		io.emit('chat-message', userName +': '+ msg);
	});
	
	socket.on('emote', function(msg){
		io.emit('emote', userName + " " + msg);
	});

	socket.on('change nick', function(nick){
		if(! _.find(users, function(user){return user.name == nick;})){			
			changeNick(userName, nick);
			var userNameOld = userName; userName = nick;
			userChange = true;
			io.emit('warn', '> User '+userNameOld+' has been renamed to '+userName);
		} else {
			socket.emit('warn', '> Username '+nick+' is already in use!');
		}
	});
  
	socket.on('disconnect', function() {
		socket.broadcast.emit('notification', '> User '+userName+' disconnected..');
		users = _.reject(users,function(user){return user.name == userName;});
		userChange = true;
		// cleanup
		delete updateTimer;
	});
	
	socket.on('list users', function(){
		socket.emit('info', '> Users online ('+users.length+') : '+JSON.stringify(users));
	});
});

//send something to all users every second;
(function(){
	var update = {};
	// Populate Update object
	if(userChange) { update['users'] = users; userChange = false; }
	// Emit if update contains data
	if(Object.keys(update).length > 0)
		io.emit('update', update);	
	// Call self
	setTimeout(arguments.callee, updateTime); 
})();

//------
generateUser = function() {
    // return Array(N+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, N);
	return 'Guest'+guests++;
}
changeNick = function(oldNick, newNick){
	users[_.findIndex(users, function(user){return user.name==oldNick;})].name = newNick;
}
//------

http.listen(3000, function(){
  console.log('listening on *:3000');
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
