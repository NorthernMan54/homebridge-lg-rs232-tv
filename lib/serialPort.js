const SerialPort = require('serialport');

var port;

module.exports = {
  LgSerialPort: LgSerialPort
};

function LgSerialPort(options) {
  port = new SerialPort(options.port);
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
    callback(data);
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
    port.once('data', (data) => {
      resolve(data.toString());
    });

    port.once('error', (err) => {
      reject(err);
    });
  });
}
