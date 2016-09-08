'use strict';
var fs = require('fs');

// TODO this should actually be epoll or uv_poll backed
function fsPoll(fd, callback) {
  process.nextTick(callback);
}

module.exports = function readUnix(buffer, offset, length, cb) {
  if (!this.isOpen) {
    process.nextTick(function() {
      cb(new Error('Port is not open'));
    });
    return;
  }

  fs.read(this.fd, buffer, offset, length, null, function(err, bytesRead) {
    if (err && err.code === 'EAGAIN') {
      fsPoll(this.fd, function() {
        this.read(buffer, offset, length, cb);
      }.bind(this));
      return;
    }

    var disconnectError = err && (
         err.code === 'EBADF' // Bad file number means we got closed
      || err.code === 'ENXIO' // No such device or address probably usb disconnect
      || err.code === 'UNKNOWN' // ¯\_(ツ)_/¯ does this ever happen?
      || err.errno === -1 // generic error
    );

    if (disconnectError) {
      return this.disconnect(err);
    }
    cb(err, bytesRead, buffer);
  }.bind(this));
};
