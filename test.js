var LgSerialPort = require('./lib/LgSerialPort').LgSerialPort;

var port = new LgSerialPort({
  port: "/dev/ttyUSB0"
});

port.powerStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log(data);
  }
});
