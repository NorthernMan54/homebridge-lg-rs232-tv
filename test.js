var Sp = require('./lib/LgSerialPort.js');

var port = new Sp({
  port: "/dev/ttyUSB0"
});

port.powerStatus();
