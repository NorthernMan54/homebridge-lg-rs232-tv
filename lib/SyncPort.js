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
  // parser = port.pipe(new Delimiter({ delimiter: 'x' }));
  // parser = port.pipe(new ByteLength({    length: 10  }));
  parser = port.pipe(new InterByteTimeout({ interval: 1000, maxBufferSize: 40 }));

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
  debug("Write: %s -> %s", command.replace(/\r/g, ''), callback);
  debug("Port Open:", port.binding.fd);
  debug("Port isOpen:", port.isOpen);
  callback = cb;

  if (port.binding.fd) {
    port.write(command);

    parser.once('data', function(data) {
      callback(null, data.toString());
      callback = null;
    });
  } else {
    callback(new Error("Port not open"));
    callback = null;
  }
};
