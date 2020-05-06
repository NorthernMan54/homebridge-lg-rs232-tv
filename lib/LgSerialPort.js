const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');
const ByteLength = require('@serialport/parser-byte-length');
var Queue = require('better-queue');

var port, parser, _sendQueue;

module.exports = {
  LgSerialPort: LgSerialPort
};

function LgSerialPort(options) {
  this.options = options;
  port = new SerialPort(options.port);
  // parser = port.pipe(new Delimiter({ delimiter: 'x' }));
  parser = port.pipe(new ByteLength({
    length: 10
  }));
  port.on('error', function(err) {
    console.error(err.message);
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
  command = "ka 00 ff\r";
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

LgSerialPort.prototype.input = function(value, callback) {
  var command;
  // [x][b][ ][Set ID][ ][Data][Cr]

  command = "xb 00 " + value + "\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.channel = function(value, callback) {
  var command;
  // [m][a][ ][0][ ][Data00][ ][Data01][ ][Data02] [] [Data03][ ][Data04][ ][Data05][Cr]

  command = "ma 00 " + value + "\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

LgSerialPort.prototype.channelStatus = function(callback) {
  var command;
  // [m][a][ ][0][ ][Data00][ ][Data01][ ][Data02] [] [Data03][ ][Data04][ ][Data05][Cr]

  command = "ma 00 ff" + value + "\r";
  _queueSendCommand(command, function(err, response) {
    callback(err, response);
  });
};

function _sendCommand(command, callback) {
  console.log("Write:", command);
  port.write(command);

  parser.once('data', function(data) {
    callback(null, data.toString());
  });

  port.once('error', function(err) {
    callback(err);
  });
}

function _queueSendCommand(command, callback) {
  _sendQueue.push(command, function(err, response) {
    callback(err, response);
  });
}
