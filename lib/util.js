// Constants

/*
Characteristic.InputSourceType.OTHER = 0;
Characteristic.InputSourceType.HOME_SCREEN = 1;
Characteristic.InputSourceType.TUNER = 2;
Characteristic.InputSourceType.HDMI = 3;
Characteristic.InputSourceType.COMPOSITE_VIDEO = 4;
Characteristic.InputSourceType.S_VIDEO = 5;
Characteristic.InputSourceType.COMPONENT_VIDEO = 6;
Characteristic.InputSourceType.DVI = 7;
Characteristic.InputSourceType.AIRPLAY = 8;
Characteristic.InputSourceType.USB = 9;
Characteristic.InputSourceType.APPLICATION = 10;
*/

/*
// The value property of InputDeviceType must be one of the following:
Characteristic.InputDeviceType.OTHER = 0;
Characteristic.InputDeviceType.TV = 1;
Characteristic.InputDeviceType.RECORDING = 2;
Characteristic.InputDeviceType.TUNER = 3;
Characteristic.InputDeviceType.PLAYBACK = 4;
Characteristic.InputDeviceType.AUDIO_SYSTEM = 5;
*/

// I copied this out of the WebUI for my Receiver

module.exports = {
  Inputs: [{
      ConfiguredName: "TUNER",
      Identifier: 0,
      InputDeviceType: 5,
      InputSourceType: 2
    },
    {
      ConfiguredName: "HDMI 1",
      Identifier: 3,
      InputDeviceType: 5,
      InputSourceType: 3
    },
    {
      ConfiguredName: "HDMI 2",
      Identifier: 4,
      InputDeviceType: 5,
      InputSourceType: 3
    },
    {
      ConfiguredName: "HDMI 3",
      Identifier: 5,
      InputDeviceType: 5,
      InputSourceType: 3
    }
  ],
  mapKeyToControl: mapKeyToControl
};

var Characteristic = {};
Characteristic.RemoteKey = {};

// Copied from HomeKitType-Television

Characteristic.RemoteKey.REWIND = 0;
Characteristic.RemoteKey.FAST_FORWARD = 1;
Characteristic.RemoteKey.NEXT_TRACK = 2;
Characteristic.RemoteKey.PREVIOUS_TRACK = 3;
Characteristic.RemoteKey.ARROW_UP = 4;
Characteristic.RemoteKey.ARROW_DOWN = 5;
Characteristic.RemoteKey.ARROW_LEFT = 6;
Characteristic.RemoteKey.ARROW_RIGHT = 7;
Characteristic.RemoteKey.SELECT = 8;
Characteristic.RemoteKey.BACK = 9;
Characteristic.RemoteKey.EXIT = 10;
Characteristic.RemoteKey.PLAY_PAUSE = 11;
Characteristic.RemoteKey.INFORMATION = 15;

function mapKeyToControl(key) {
  var code;
  switch (key) {
    case Characteristic.RemoteKey.ARROW_RIGHT:
      code = "Skip Fwd";
      break;
    case Characteristic.RemoteKey.ARROW_LEFT:
      code = "Skip Rev";
      break;
    case Characteristic.RemoteKey.PLAY_PAUSE:
      code = "Pause";
      break;
    case Characteristic.RemoteKey.SELECT:
      code = "Play";
      break;
    case Characteristic.RemoteKey.BACK:
      code = "Stop";
      break;
  }
  return (code);
}
