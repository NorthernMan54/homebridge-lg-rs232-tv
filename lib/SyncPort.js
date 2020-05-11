const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');
const ByteLength = require('@serialport/parser-byte-length');
const InterByteTimeout = require('@serialport/parser-inter-byte-timeout');
var debug = require('debug')('lg-rs232-tv:SyncPort');

module.exports = {
  SyncPort: SyncPort
};

var port, parser, callback;

function SyncPort(options) {
  this.options = options;
  debug("Connecting to:", options.port);
  port = new SerialPort(options.port);
  parser = port.pipe(new Delimiter({ delimiter: 'x' }));
  // parser = port.pipe(new ByteLength({    length: 10  }));
  /*
  parser = port.pipe(new InterByteTimeout({
    interval: 1000,
    maxBufferSize: 40
  }));
  */

  port.on('error', function(err) {
    if (callback) {
      callback(err);
      callback = null;
    } else {
      console.error("ERROR:", err.message);
    }
  });
}

SyncPort.prototype.write = function(command, cb) {
  debug("Write: %s: %s", _asciiToHexa(command), command.replace(/\r/g, ''));
  // debug("Port Open:", port.binding.fd);
  // debug("Port isOpen:", port.isOpen);
  callback = cb;

  if (port.isOpen) {
    port.write(command);

    parser.once('data', function(data) {
      debug("Read: %s: %s", _asciiToHexa(data), data);
      if (callback) {
        callback(null, data.toString());
        callback = null;
      } else {
        debug("ERROR: Received data but no callback: %s: %s", _asciiToHexa(data), data);
      }
    });
  } else {
    callback(new Error("Port not open"));
    callback = null;
  }
};

function _asciiToHexa(str) {
  var arr1 = [];
  if (str) {
    for (var n = 0, l = str.length; n < l; n++) {
      var hex = Number(str.charCodeAt(n)).toString(16);
      arr1.push(hex);
    }
  }
  return arr1.join('');
}
