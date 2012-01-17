var test = require('tap').test;
var Waitlist = require('../');
var EventEmitter = require('events').EventEmitter;

test('release', function (t) {
    var ws = new Waitlist;
    
    var stats = [];
    ws.on('stats', function (s) {
        stats.push(JSON.parse(JSON.stringify(s)));
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
        t.deepEqual(stats, [
            { resources : 1, waiting : 0, using : 0 },
            { resources : 1, waiting : 0, using : 1 },
            { resources : 1, waiting : 1, using : 1 },
            { resources : 1, waiting : 2, using : 1 },
            { resources : 1, waiting : 1, using : 1 },
            { resources : 1, waiting : 2, using : 1 },
            { resources : 1, waiting : 1, using : 1 },
            { resources : 1, waiting : 0, using : 1 },
            { resources : 0, waiting : 0, using : 1 },
        ]);
        t.end();
    }, 100);
});
