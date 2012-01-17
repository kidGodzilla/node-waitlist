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
    
    var avail = Object.keys(self.resources).filter(function (key) {
        return self.resources[key].lease === null;
    });
    
    if (avail.length > 0) {
        self.dispatch(token, avail.values[0]);
    }
    else {
        self.queue.push(token);
        self.queue.forEach(function (id, i) {
            self.sessions[id].emit('spot', i + 1, self.queue.length);
        });
        self.emit('stats', self.stats);
    }
    
    return token;
};

Resources.prototype.release = function (token) {
    var self = this;
    delete self.tokens[token];
    
    var ix = self.queue.indexOf(token);
    if (ix >= 0) {
        queue.splice(ix, 1);
        
        queue.forEach(function (id, j) {
            self.sessions[id].emit('spot', j + 1, self.queue.length);
        });
        
        self.stats.waiting -= 1;
        self.emit('stats', self.stats);
        
        return;
    }
    
    var res = hash(resources).detect(function (r) {
        return r.lease && r.lease.token == token
    });
    
    if (res) { // bound to a resource
        res.emit('release');
        res.lease = null;
        res.emit = null;
        
        self.stats.using -= 1;
        
        var q = queue.shift();
        if (q) {
            self.dispatch(q.token, res);
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
    res.lease.end = res.lease.start + ms;
    res.emit = session.emit;
    
    if (session.time > 0) {
        setTimeout(function () {
            emit('expire');
            self.release(token);
        }, session.time);
    }
    
    session.emit('available', res.resource, res.key, res.lease);
    self.stats.using += 1;
    self.emit('stats', self.stats);
};
