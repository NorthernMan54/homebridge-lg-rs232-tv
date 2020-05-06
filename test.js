var LgSerialPort = require('./lib/LgSerialPort.js');

var port = new LgSerialPort({
  port: "/dev/ttyUSB0"
});

port.powerStatus();
