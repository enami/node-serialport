'use strict';

var binding = require('bindings')('serialport.node');

function DarwinBinding(opt) {
  if (typeof opt !== 'object') {
    throw new TypeError('options is not an object');
  }
  if (typeof opt.disconnect !== 'function') {
    throw new TypeError('options.disconnect is not a function');
  }
  this.disconnect = opt.disconnect;
  this.fd = null;
};

DarwinBinding.prototype.read = require('./read-unix');

DarwinBinding.prototype.open = function(path, options, cb) {
  if (this.isOpen) {
    process.nextTick(function() {
      cb(new Error('Already open'));
    });
    return;
  }
  binding.open(path, options, function(err, fd) {
    if (err) {
      return cb(err);
    }
    this.fd = fd;
    cb(null);
  }.bind(this));
};

DarwinBinding.prototype.close = function(cb) {
  if (!this.isOpen) {
    process.nextTick(function() {
      cb(new Error('Already closed'));
    });
    return;
  }

  binding.close(this.fd, function(err) {
    if (err) {
      return cb(err);
    }
    this.fd = null;
    cb(null);
  }.bind(this));
};

DarwinBinding.prototype.set = function(opt, cb) {
  if (typeof opt !== 'object') {
    throw new TypeError('options is not an object');
  }

  if (!this.isOpen) {
    return cb(new Error('Port is not open'));
  }
  binding.set(this.fd, opt, cb);
};

DarwinBinding.prototype.write = function(buffer, cb) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('buffer is not a Buffer');
  }

  if (!this.isOpen) {
    return cb(new Error('Port is not open'));
  }

  binding.write(this.fd, buffer, cb);
};

var commonMethods = [
  'drain',
  'flush',
  'update',
  'get'
];

commonMethods.map(function(methodName) {
  DarwinBinding.prototype[methodName] = function() {
    var args = Array.prototype.slice.apply(arguments);
    if (!this.isOpen) {
      var cb = args.pop();
      process.nextTick(function() {
        cb(new Error('Port is not open'));
      });
      return;
    }
    args.unshift(this.fd);
    binding[methodName].apply(binding, args);
  };
});

Object.defineProperty(DarwinBinding.prototype, 'isOpen', {
  enumerable: true,
  get: function() {
    return this.fd !== null;
  }
});

DarwinBinding.list = binding.list;
module.exports = DarwinBinding;
