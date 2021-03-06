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
  parser = port.pipe(new Delimiter({
    delimiter: 'x'
  }));
  // parser = port.pipe(new ByteLength({    length: 10  }));
  /*
  parser = port.pipe(new InterByteTimeout({
    interval: 1000,
    maxBufferSize: 40
  }));
  */

  port.on('open', function() {
    debug("Open: ", port.path);
  });

  port.on('close', function() {
    debug("Close: ", port.path);
  });

  port.on('data', function(data) {
    // debug("data: ", data);
  });

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

    parser.removeAllListeners('data'); // Prevent listener leak

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
  str = str.toString();
  if (str && str.length > 0) {
    for (var n = 0, l = str.length; n < l; n++) {
      var hex = _right("0" + Number(str.charCodeAt(n)).toString(16), 2);
      if (n % 4) {
        arr1.push(' ');
      } else {
        if (n) {
          arr1.push(' - ');
        }
      }
      arr1.push(hex);
    }
  }
  return arr1.join('');
}

function _right(str, chr) {
  return str.slice(-(chr));
}

function _left(str, chr) {
  return str.slice(0, chr);
}
