
var LgSerialPort = require('./lib/LgSerialPort').LgSerialPort;

var port = new LgSerialPort({
  port: "/dev/ttyUSB0"
});


port.powerStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Power:", data, _asciiToHexa(data));
  }
});

port.inputStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Input:", data, _asciiToHexa(data));
  }
});

port.channelStatus(function(err, data) {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Channel:", data, _asciiToHexa(data));
  }
});

/*

console.log("9-1 ->", _channel("9-1"));
console.log("29-1 ->", _channel("29-1"));

console.log("9-1 ->", _decodeChannel("a 00 OK080009000102"));
console.log("17-1 ->", _decodeChannel("a 00 OK1f0011000102"));
console.log("17-2 ->", _decodeChannel("a 00 OK1f0011000202"));
*/

function _channel(str) {
  var arr1 = [];
  str.split("-").forEach((item, i) => {
    console.log("item", item);
    arr1.push(" 00 ");
    // var str = "0" + item;
    arr1.push(('00' + Number(item).toString(16).toUpperCase()).slice(-2));
  });
  return arr1.join('');
}

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

function _hexToAscii(hex) {
  return String(parseInt(hex, 16));
}

function _decodeChannel(input) {
  // a 00 OK080009000102 -> 9-1
  // a 00 OK1f0011000102 -> 17-1
  // a 00 OK1f0011000202 -> 17-2
  var high = input.substring(11, 13);
  var low = input.substring(15, 17);
  return (_hexToAscii(high) + "-" + _hexToAscii(low));
}

function _right(str, chr) {
  return str.slice(-(chr));
}

function _left(str, chr) {
  return str.slice(0, chr);
}
