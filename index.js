var EventEmitter = require('events').EventEmitter;
var Hash = require('hashish');

module.exports = Resources;
Resources.prototype = new EventEmitter;
function Resources () {
    if (!(this instanceof Resources)) return new Resources();
    var self = this;
    var resources = self.resources = {};
    
    var queue = self.queue = [];
    self.using = 0;
    
    self.stats = function () {
        return {
            resources : Object.keys(resources).length,
            waiting : queue.length,
            using : self.using,
        };
    };
    
    self.add = function (key, res) {
        resources[key] = {
            key : key,
            resource : res,
            lease : null,
            emit : null,
        };
        self.emit('stats', self.stats());
    };
    
    self.remove = function (key) {
        delete resources[key];
        self.emit('stats', self.stats());
    };
    
    var tokens = {};
    var emitters = {};
    
    self.acquire = function (ms, emit) {
        do {
            var token = Math.floor(Math.random() * Math.pow(2,32)).toString(16);
        } while (tokens[token]);
        tokens[token] = true;
        
        emit('token', token);
        
        var avail = Hash(resources).filter(function (res) {
            return res.lease === null;
        });
        
        if (avail.length > 0) {
            dispatch(avail.values[0], token, ms, emit);
        }
        else {
            queue.push({ token : token, time : ms, emit : emit });
            queue.forEach(function (x, i) {
                x.emit('spot', i + 1, queue.length);
            });
            self.emit('stats', self.stats());
        }
        
        return token;
    };
    
    self.release = function (token) {
        delete tokens[token];
        
        var i = queue.map(function (q) { return q.token }).indexOf(token);
        if (i >= 0) { // in the queue
            queue.splice(i, 1);
            queue.forEach(function (x, j) {
                x.emit('spot', j + 1, queue.length);
            });
            self.emit('stats', self.stats());
            return;
        }
        
        var res = Hash(resources).detect(function (r) {
            return r.lease && r.lease.token == token
        });
        
        if (res) { // bound to a resource
            res.emit('release');
            res.lease = null;
            res.emit = null;
            
            self.using -= 1;
            
            var q = queue.shift();
            if (q) {
                dispatch(res, q.token, q.time, q.emit);
                queue.forEach(function (x, i) {
                    x.emit('spot', i + 1, queue.length);
                });
            }
            self.emit('stats', self.stats());
        }
    };
    
    function dispatch (res, token, ms, emit) {
        res.lease = {
            start : Date.now(),
            time : ms,
            token : token,
        };
        res.lease.end = res.lease.start + ms;
        res.emit = emit;
        
        if (ms > 0) {
            setTimeout(function () {
                emit('expire');
                self.release(token);
            }, ms);
        }
        
        emit('available', res.resource, res.key, res.lease);
        self.using += 1;
        self.emit('stats', self.stats());
    }
}
