waitlist
========

Manage consumers standing in a queue for limited resources.

example
=======

``` js
var waitlist = require('waitlist');
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
```

output:

```
$ node examples/shared.js 
user 0 using resource {"id":0}
user 1 using resource {"id":1}
user 2 in spot 1
user 2 in spot 1
user 3 in spot 2
user 0 expired
user 2 using resource {"id":0}
user 3 in spot 1
user 3 in spot 1
user 4 in spot 2
user 3 in spot 1
user 4 in spot 2
user 5 in spot 3
user 1 expired
user 3 using resource {"id":1}
user 4 in spot 1
user 5 in spot 2
^C
```

methods
=======

var waitlist = require('waitlist')

var ws = waitlist()
-------------------

Create a new waitlist.

ws.add(name, res)
-----------------

Add a new resource `name` with the resource object `res`.
`res` will be made available to consumers.

ws.remove(name)
---------------

Remove a resource by its `name`.

ws.acquire(time, emit)
----------------------

Try to acquire an available resource for `time` milliseconds.

If `time` is 0, the session won't expire automatically.

Resource events will be passed through the `emit` function supplied.

ws.release(token)
-----------------

Release a granted token.

ws.on('stats', cb)
------------------

Emitted whenever the queue stats of available resources and connected clients
changes. `cb(stats)` is called with the `ws.stats` object which looks like:

``` js
{ resources : 2, waiting : 0, using : 1 },
```

resource events
===============

The `emit` function passed to `ws.acquire()` receives these events:

'token', token
--------------

Emits the token for the current session right after `acquire()` is called.

'spot', ix
----------

If the resource isn't available right away, emit the position in the queue.

'available', res, name, time
----------------------------

Emitted when a resource `res` with the name `name` is ready for `time`
milliseconds of use.

'expire'
--------

Emitted when a session's alloted time is up.

'release'
---------

Emitted when a session is finished either through `ws.release()` or expiry.

install
=======

With [npm](http://npmjs.org) do:

```
npm install waitlist
```

[![build status](https://secure.travis-ci.org/substack/node-waitlist.png)](http://travis-ci.org/substack/node-waitlist)
