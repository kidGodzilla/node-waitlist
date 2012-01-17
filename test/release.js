var test = require('tap').test;
var Waitlist = require('waitlist');
var EventEmitter = require('events').EventEmitter;

test('release', function (t) {
    var ws = new Waitlist;
    
    var resources = [];
    ws.on('resources', function (n) {
        resources.push(n);
    });
    
    var waiting = [];
    ws.on('waiting', function (n) {
        waiting.push(n);
    });
    
    var removed = [];
    ws.on('remove', function (n) {
        removed.push(n);
    });
    
    ws.add('moo', {});
    
    var t1 = ws.acquire(50, function () {});
    var t2 = ws.acquire(50, function () {});
    
    var em = new EventEmitter;
    
    em.on('token', function (tt) {
        setTimeout(function () {
            t.equal(token, tt);
        }, 1);
    });
    
    var spots = [];
    em.on('spot', function (n) {
        spots.push(n);
    });
    
    var token = ws.acquire(150, em.emit.bind(em));
    setTimeout(function () {
        ws.acquire(50, function () {});
        ws.release(token);
    }, 30);
    
    ws.release(t1);
    
    setTimeout(function () {
        ws.release(token);
        ws.remove('moo');
        t.deepEqual(spots, [ 2, 1, 1 ]);
        t.deepEqual(waiting, [ 1, 2, 1, 2, 1, 0 ]);
        t.deepEqual(resources, [ 1, 0 ]);
        t.end();
    }, 100);
});

