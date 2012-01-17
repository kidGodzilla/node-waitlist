var waitlist = require('../');
var EventEmitter = require('events').EventEmitter;

var ws = waitlist();

ws.add('beep', { id : 0 });
ws.add('boop', { id : 1 });

(function consume (userId) {
    setTimeout(function () {
        var em = new EventEmitter;
        em.on('spot', function (n) {
            console.log('user ' + userId + ' in spot ' + n);
        });
        
        em.on('available', function (res) {
            console.log('user ' + userId
                + ' using resource ' + JSON.stringify(res)
            );
        });
        
        em.on('expire', function () {
            console.log('user ' + userId + ' expired');
        });
        
        ws.acquire(Math.random() * 1000, em.emit.bind(em));
        
        consume(userId + 1);
    }, Math.random() * 500);
})(0)
