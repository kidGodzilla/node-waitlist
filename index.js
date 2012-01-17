var EventEmitter = require('events').EventEmitter;
var hash = require('hashish');

module.exports = function () {
    return new Resources;
}
Resources.prototype = new EventEmitter;

function Resources () {
    this.resources = {};
    this.queue = [];
    this.sessions = {};
    
    this.stats = {
        resources : 0,
        waiting : 0,
        using : 0
    };
}

Resources.prototype.add = function (key, res) {
    this.resources[key] = {
        key : key,
        resource : res,
        lease : null,
        emit : null,
    };
    this.stats.resources ++;
    this.emit('stats', this.stats);
};

Resources.prototype.remove = function (key) {
    delete this.resources[key];
    this.stats.resources --;
    this.emit('stats', this.stats);
};

Resources.prototype.acquire = function (ms, emit) {
    var self = this;
    
    var token;
    do {
        token = Math.floor(Math.random() * Math.pow(2,32)).toString(16);
    } while (self.sessions[token]);
    
    self.sessions[token] = { emit : emit, time : ms };
    
    emit('token', token);
    
    var avail = hash.detect(self.resources, function (r) {
        return r.lease === null;
    });
    
    if (avail) {
        self.dispatch(token, avail);
        self.emit('stats', self.stats);
    }
    else {
        self.queue.push(token);
        self.queue.forEach(function (id, i) {
            self.sessions[id].emit('spot', i + 1, self.queue.length);
        });
        
        self.stats.waiting ++;
        self.emit('stats', self.stats);
    }
    
    return token;
};

Resources.prototype.release = function (token) {
    var self = this;
    delete self.sessions[token];
    
    var ix = self.queue.indexOf(token);
    if (ix >= 0) {
        self.queue.splice(ix, 1);
        
        self.queue.forEach(function (id, j) {
            self.sessions[id].emit('spot', j + 1, self.queue.length);
        });
        
        self.stats.waiting --;
        self.emit('stats', self.stats);
        
        return;
    }
    
    var res = hash.detect(self.resources, function (r) {
        return r.lease && r.lease.token == token
    });
    
    if (res) { // bound to a resource
        res.emit('release');
        res.lease = null;
        res.emit = null;
        
        self.stats.using --;
        
        var q = self.queue.shift();
        if (q) {
            self.stats.waiting --;
            self.dispatch(q, res);
            self.queue.forEach(function (id, i) {
                self.sessions[id].emit('spot', i + 1, self.queue.length);
            });
        }
        self.emit('stats', self.stats);
    }
};

Resources.prototype.dispatch = function (token, res) {
    var self = this;
    var session = self.sessions[token];
    
    res.lease = {
        start : Date.now(),
        time : session.time,
        token : token,
    };
    res.lease.end = res.lease.start + session.time;
    res.emit = session.emit;
    
    if (session.time > 0) {
        setTimeout(function () {
            session.emit('expire');
            self.release(token);
        }, session.time);
    }
    
    session.emit('available', res.resource, res.key, res.lease);
    self.stats.using ++;
};
