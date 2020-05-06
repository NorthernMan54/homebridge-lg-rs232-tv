const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');
const ByteLength = require('@serialport/parser-byte-length');

var port, parser;

module.exports = {
  LgSerialPort: LgSerialPort
};

function LgSerialPort(options) {
  this.options = options;
  port = new SerialPort(options.port);
  // parser = port.pipe(new Delimiter({ delimiter: 'x' }));
  parser = port.pipe(new ByteLength({length: 8}))
  port.on('error', function(err) {
    console.error(err.message);
  });
}

LgSerialPort.prototype.power = function(value, callback) {
  var command;
  if (value) {
    command = "ka 00 01\r";
  } else {
    command = "ka 00 00\r";
  }
  _sendCommand(command).then((data) => {
    console.log(data);
    callback(null, data);
  });
};

LgSerialPort.prototype.powerStatus = function(callback) {
  var command;
  // [k][a][ ][Set ID][ ][FF][Cr]
  command = "ka 00 ff\r";
  _sendCommand(command).then((data) => {
    console.log(data);
    callback(null, data);
  }).catch(e => {
    callback(e);
  });
};

LgSerialPort.prototype.inputStatus = function(callback) {
  var command;
  // [k][a][ ][Set ID][ ][FF][Cr]
  command = "xb 00 ff\r";
  _sendCommand(command).then((data) => {
    console.log(data);
    callback(null, data);
  }).catch(e => {
    callback(e);
  });
};

LgSerialPort.prototype.input = function(value, callback) {
  var command;
  // [x][b][ ][Set ID][ ][Data][Cr]

  command = "xb 00 " + value + "\r";
  _sendCommand(command).then((data) => {
    console.log(data);
    callback(null, data);
  });
};

LgSerialPort.prototype.channel = function(value, callback) {
  var command;
  // [m][a][ ][0][ ][Data00][ ][Data01][ ][Data02] [] [Data03][ ][Data04][ ][Data05][Cr]

  command = "ma 00 " + value + "\r";
  _sendCommand(command).then((data) => {
    console.log(data);
    callback(null, data);
  });
};

function _sendCommand(command) {
  return new Promise((resolve, reject) => {
    port.write(command);

    parser.once('data', (data) => {
      resolve(data.toString());
    });

    port.once('error', (err) => {
      reject(err);
    });
  });
}
