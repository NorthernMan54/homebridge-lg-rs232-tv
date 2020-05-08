const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');
const ByteLength = require('@serialport/parser-byte-length');
const InterByteTimeout = require('@serialport/parser-inter-byte-timeout');
var debug = require('debug')('lg-rs232-tv:lib');
var Queue = require('better-queue');

var port, parser, _sendQueue;

module.exports = {
  LgSerialPort: LgSerialPort
};

function LgSerialPort(options) {
  this.options = options;
  debug("Connecting to:", options.port);
  port = new SerialPort(options.port);
  // parser = port.pipe(new Delimiter({ delimiter: 'x' }));
  // parser = port.pipe(new ByteLength({    length: 10  }));
  parser = port.pipe(new InterByteTimeout({
    interval: 100,
    maxBufferSize: 10
  }));

  port.on('error', function(err) {
    console.error("ERROR", err.message);
  });

  _sendQueue = new Queue(function(node, cb) {
    _sendCommand(node, cb);
  }, {
    concurrent: 1,
    autoResume: true,
    maxRetries: 1000,
    retryDelay: 30000
  });
}

LgSerialPort.prototype.power = function(value, callback) {
  var command;
  if (value) {
    command = "ka 00 01\r";
  } else {
    command = "ka 00 00\r";
  }
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.powerStatus = function(callback) {
  var command;
  // [k][a][ ][Set ID][ ][FF][Cr]
  // debug("Port:", port);
  command = "ka 00 ff\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.input = function(value, callback) {
  var command;
  // [x][b][ ][Set ID][ ][Data][Cr]

  command = "xb 00 " + value + "\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.inputStatus = function(callback) {
  var command;
  // [k][a][ ][Set ID][ ][FF][Cr]
  command = "xb 00 ff\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.channel = function(value, callback) {
  var command;
  //   'stationctv'    : b"ma 00 00 00 09 00 01 22",
  //   'stationcbc'    : b"ma 00 00 00 05 00 01 22",
  //                       ma 00 00 00 57 00 01 22
  //                       ma 00 00 00 05 00 01 22
  // [m][a][ ][0][ ][Data00][ ][Data01][ ][Data02] [] [Data03][ ][Data04][ ][Data05][Cr]

  command = "ma 00 00" + _channel(value) + " 22\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.channelStatus = function(callback) {
  var command;
  // [m][a][ ][0][ ][Data00][ ][Data01][ ][Data02] [] [Data03][ ][Data04][ ][Data05][Cr]

  command = "ma 00 ff" + "\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

function _sendCommand(command, callback) {
  debug("Write:", command);
  debug("Port Open:", port.binding.fd);
  if (port.binding.fd) {
    port.write(command);

    parser.once('data', function(data) {
      callback(null, data.toString());
    });

    port.once('error', function(err) {
      callback(err);
    });
  } else {
    callback(new Error("Port not open"));
  }
}

function _queueSendCommand(command, callback) {
  _sendQueue.push(command, function(err, response) {
    callback(err, response);
  });
}

function _channel(str) {
  var arr1 = [];
  str.split("-").forEach((item, i) => {
    debug("item", item);
    arr1.push(" 00 ");
    arr1.push(('00' + Number(item).toString(16).toUpperCase()).slice(-2));
  });
  return arr1.join('');
}

function _asciiToHexa(str) {
  var arr1 = [];
  for (var n = 0, l = str.length; n < l; n++) {
    var hex = Number(str.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join('');
}
