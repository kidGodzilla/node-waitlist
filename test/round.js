var test = require('tap').test;
var Waitlist = require('../');
var EventEmitter = require('events').EventEmitter;

test('round robins', function (t) {
    var ws = new Waitlist;
    
    ws.add(0, { id : 0 });
    ws.add(1, { id : 1 });
    
    var resources = [];
    for (var i = 0; i < 10; i++) setTimeout(function () {
        var e = new EventEmitter;
        e.on('available', function (res, key, lease) {
            resources.push(JSON.parse(JSON.stringify(res)));
        });
        ws.acquire(5, e.emit.bind(e));
    }, 10 * i);
    
    setTimeout(function () {
        t.deepEqual(resources, [
            { id : 0 },
            { id : 1 },
            { id : 0 },
            { id : 1 },
            { id : 0 },
            { id : 1 },
            { id : 0 },
            { id : 1 },
            { id : 0 },
            { id : 1 },
        ]);
        t.end();
    }, 150);
});
