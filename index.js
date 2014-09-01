var irc = require('slate-irc'),
	net = require('net');

module.exports = function (nick, pass) {
	var inst = new process.EventEmitter(),
		stream = net.connect({
			port: 6667,
			host: 'irc.ppy.sh'
		}),
		client = irc(stream),
		buffer = [],
		timeout = null,
		ready = false,
		startTimeout = false,
		pushIRC = function () {
			var line = buffer.splice(0, 1)[0];
			if (line) {
				client.send(line.target, line.msg);
				timeout = setTimeout(pushIRC, 2000);
			} else {
				timeout = null;
			}
		},
		send = function (target, msg) {
			buffer.push({
				msg: msg,
				target: target || nick
			});
			if (ready && timeout === null) {
				timeout = setTimeout(pushIRC, 0);
			} else if (!ready && !startTimeout) {
				startTimeout = true;
			}
		},
		checkLink = function (msg) {
			var regex = /http:\/\/osu\.ppy\.sh\/p\/ircauth\?action=allow&nick=.+&ip=\d+\.\d+\.\d+\.\d+/;
			if (regex.test(msg.trailing)) {
				inst.emit('auth', regex.exec(msg.trailing)[0]);
			}
		};
	if (pass) {
		client.pass(pass);
	}
	client.nick(nick);
	client.user(nick, nick);

	client.on('motd', function () {
		if (startTimeout) {
			timeout = setTimeout(pushIRC, 0);
		}
		ready = true;
		inst.emit('ready');
		client.removeListener('data', checkLink);
	});
	client.on('data', checkLink);
	client.on('message', function (msg) {
		inst.emit('message', msg);
	});
	inst.send = send;
	return inst;
};