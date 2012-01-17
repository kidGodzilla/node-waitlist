var test = require('tap').test;
var Waitlist = require('waitlist');
var EventEmitter = require('events').EventEmitter;

test('comprehensive', function (t) {
    function Foo (x) { this.x = x }
    
    var ws = new Waitlist;
    var counts = { resources : [], waiting : [], using : [] };
    ws.on('resources', function (n) {
        counts.resources.push(n);
    });
    ws.on('waiting', function (n) {
        counts.waiting.push(n);
    });
    ws.on('using', function (n) {
        counts.using.push(n);
    });
    
    [ 1, 2 ].forEach(function (i) {
        ws.add(i, new Foo(i * 10));
    });
    
    t.deepEqual(counts, {
        resources : [ 1, 2 ],
        waiting : [],
        using : []
    });
    
    var e1 = new EventEmitter;
    var e2 = new EventEmitter;
    var e3 = new EventEmitter;
    
    var expired = [], avail = [], spots = [], released = [];
    [ e1, e2, e3 ].forEach(function (e) {
        e.on('available', function (res, key, lease) {
            avail.push({
                em : e,
                res : res,
                lease : lease,
                key : key,
                time : Date.now(),
            });
        });
        e.on('spot', function (i) {
            spots.push({ em : e, spot : i });
        });
        e.on('expire', function () {
            expired.push({
                em : e,
                time : Date.now()
            });
        });
        e.on('release', function () {
            released.push({
                em : e,
                time : Date.now()
            });
        });
    });
    
    ws.acquire(150, e1.emit.bind(e1));
    ws.acquire(50, e2.emit.bind(e2));
    ws.acquire(50, e3.emit.bind(e3));
    
    setTimeout(function () {
        t.equal(avail.length, 2);
        t.equal(expired.length, 0);
        t.equal(released.length, 0);
        t.deepEqual(counts.waiting, [ 1 ]);
        t.deepEqual(counts.using, [ 1, 2 ]);
    }, 25);
    
    setTimeout(function () {
        t.deepEqual(counts.waiting, [ 1, 0, 0, 0 ]);
        t.deepEqual(counts.using, [ 1, 2, 2, 2, 1, 0 ]);
        t.equal(avail.length, 3);
        t.equal(expired.length, 3);
        t.equal(released.length, 3);
        t.equal(spots.length, 1);
        
        t.deepEqual(
            avail.map(function (x) { return x.em }),
            [ e1, e2, e3 ]
        );
        
        t.deepEqual(
            expired.map(function (x) { return x.em }),
            [ e2, e3, e1 ]
        );
        
        t.deepEqual(
            released.map(function (x) { return x.em }),
            [ e2, e3, e1 ]
        );
        
        t.deepEqual(spots, [ { em : e3, spot : 1 } ]);
        
        var switched = [
            { avail : avail[0], expired : expired[2], released : expired[2] },
            { avail : avail[1], expired : expired[0], released : expired[0] },
            { avail : avail[2], expired : expired[1], released : expired[1] },
        ];
        
        switched.forEach(function (x) {
            var ea = x.expired.time - x.avail.time;
            var ra = x.released.time - x.avail.time;
            var tt = x.avail.lease.time;
            t.ok(Math.abs(ea - tt) < 10); // 10 ms tolerance
            t.ok(Math.abs(ra - tt) < 10); // 10 ms tolerance
        });
        
        var waited = switched[2].avail.time - switched[1].avail.time;
        t.ok(waited < 60 && waited >= 50, 'resource available after 50ms');
        
        t.end();
    }, 500);
});

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
