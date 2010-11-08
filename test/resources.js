var Waitlist = require('waitlist');
var EventEmitter = require('events').EventEmitter;

exports.comprehensive = function (assert) {
    function Foo (x) { this.x = x }
    
    var ws = new Waitlist;
    var counts = { resources : [], waiting : [] };
    ws.on('resources', function (n) {
        counts.resources.push(n);
    });
    ws.on('waiting', function (n) {
        counts.waiting.push(n);
    });
    
    [ 1, 2 ].forEach(function (i) {
        ws.add(i, new Foo(i * 10));
    });
    
    assert.deepEqual(counts, {
        resources : [ 1, 2 ],
        waiting : [],
    });
    
    var e1 = new EventEmitter;
    var e2 = new EventEmitter;
    var e3 = new EventEmitter;
    
    var expired = [], avail = [], spots = [];
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
    });
    
    ws.acquire(150, e1.emit.bind(e1));
    ws.acquire(50, e2.emit.bind(e2));
    ws.acquire(50, e3.emit.bind(e3));
    
    setTimeout(function () {
        assert.equal(avail.length, 2);
        assert.equal(expired.length, 0);
        assert.deepEqual(counts.waiting, [ 1 ]);
    }, 25);
    
    setTimeout(function () {
        assert.deepEqual(counts.waiting, [ 1, 0, 0, 0 ]);
        assert.equal(avail.length, 3);
        assert.equal(expired.length, 3);
        assert.equal(spots.length, 1);
        
        assert.deepEqual(
            avail.map(function (x) { return x.em }),
            [ e1, e2, e3 ]
        );
        
        assert.deepEqual(
            expired.map(function (x) { return x.em }),
            [ e2, e3, e1 ]
        );
        
        assert.deepEqual(spots, [ { em : e3, spot : 1 } ]);
        
        var switched = [
            { avail : avail[0], expired : expired[2] },
            { avail : avail[1], expired : expired[0] },
            { avail : avail[2], expired : expired[1] },
        ];
        
        switched.forEach(function (x) {
            var elapsed = x.expired.time - x.avail.time;
            var t = x.avail.lease.time;
            assert.ok(Math.abs(elapsed - t) < 10); // 10 ms tolerance
        });
        
        var waited = switched[2].avail.time - switched[1].avail.time;
        assert.ok(waited < 60 && waited >= 50, 'resource available after 50ms');
    }, 500);
};

exports.release = function (assert) {
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
    
    em.on('token', function (t) {
        setTimeout(function () {
            assert.equal(token, t);
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
        assert.deepEqual(spots, [ 2, 1, 1 ]);
        assert.deepEqual(waiting, [ 1, 2, 1, 2, 1, 0 ]);
        assert.deepEqual(resources, [ 1, 0 ]);
    }, 100);
};
