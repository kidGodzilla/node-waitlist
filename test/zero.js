var test = require('tap').test;
var Waitlist = require('../');
var EventEmitter = require('events').EventEmitter;

test('zero', function (t) {
    var ws = new Waitlist;
    ws.add('zing', {});
    
    var em = new EventEmitter;
    var counts = { available : 0, expire : 0 };
    em.on('available', function (t) {
        counts.available ++;
    });
    em.on('expire', function (t) {
        counts.expire ++;
    });
    
    var t0 = ws.acquire(0, em.emit.bind(em));
    var t1 = ws.acquire(0, em.emit.bind(em));
    
    setTimeout(function () {
        t.equal(counts.available, 1);
        t.equal(counts.expire, 0);
        ws.remove('zing');
        t.end();
    }, 100);
});
