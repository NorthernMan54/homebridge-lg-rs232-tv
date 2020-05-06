var LgSerialPort = require('./lib/LgSerialPort').LgSerialPort;

var port = new LgSerialPort({
  port: "/dev/ttyUSB0"
});

port.powerStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Power:", data, asciiToHexa(data));
  }
});

port.inputStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Input:", data, asciiToHexa(data));
  }
});

port.channelStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Channel:", data, asciiToHexa(data));
  }
});

function asciiToHexa(str) {
  var arr1 = [];
  for (var n = 0, l = str.length; n < l; n++) {
    var hex = Number(str.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join('');
}
