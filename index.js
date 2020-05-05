/*

Configuration Sample:
"platforms": [{
  "platform": "lg-rs232-tv",
  "devices": [{
    "name": "Family Room",
    "type": "rs232"
  }]
}]

*/

"use strict";

var Accessory, Service, Characteristic, UUIDGen;
// var inherits = require('util').inherits;
var debug = require('debug')('lg-rs232-tv');
var serialPort = require('./lib/serialPort');
var os = require("os");
// var util = require('./lib/util.js');
// var Yamaha = require('yamaha-nodejs');
// var Q = require('q');
// var bonjour = require('bonjour')();
// var ip = require('ip');

var configuredAccessories = [];

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  homebridge.registerPlatform("homebridge-lg-rs232-tv", "lg-rs232-tv", lgRS232Tv, true);
};

function lgRS232Tv(log, config, api) {
  this.log = log;
  this.config = config;
  this.api = api;

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
}

lgRS232Tv.prototype.configureAccessory = function(accessory) {
  debug("configureAccessory", accessory);
};

lgRS232Tv.prototype.didFinishLaunching = function() {
  this.config.devices.forEach(function(device) {
    this.log("Configuring", device.name);

    var uuid = UUIDGen.generate(device.name);
    var tvAccessory = new Accessory(device.name, uuid, Accessory.Categories.TELEVISION);
    var tvAccessoryInfo = tvAccessory.getService(Service.AccessoryInformation);

    var hostname = os.hostname();
    tvAccessoryInfo
      .setCharacteristic(Characteristic.Manufacturer, "homebridge-lg-rs232-tv")
      .setCharacteristic(Characteristic.Model, device.type)
      .setCharacteristic(Characteristic.SerialNumber, hostname)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

    var tv = new LgTv(this, device, tvAccessory);
    // tvAccessory.configureCameraSource(cameraSource);
    configuredAccessories.push(tvAccessory);
  });
  this.api.publishExternalAccessories("homebridge-lg-rs232-tv", configuredAccessories);
};

function LgTv(log, config, name, yamaha, sysConfig, zone, accessory, unitName, inputs, controlAccessory) {
  this.log = log;
  this.config = config;
  this.name = name;
  this.yamaha = yamaha;
  this.sysConfig = sysConfig;
  this.zone = zone;
  this.accessory = accessory;
  this.unitName = unitName;
  this.inputs = inputs;
  this.controlAccessory = controlAccessory;

  this.radioPresets = config["radio_presets"] || false;
  this.presetNum = config["preset_num"] || false;
  this.minVolume = config["min_volume"] || -80.0;
  this.maxVolume = config["max_volume"] || -10.0;
  this.cursorRemoteControl = config["cursor_remote_control"] || false;
  this.gapVolume = this.maxVolume - this.minVolume;
}

LgTv.prototype = {

  setPlaying: function(playing) {
    var that = this;
    var yamaha = this.yamaha;

    if (playing) {
      return yamaha.powerOn(that.zone).then(function() {
        yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
          if (basicInfo.getCurrentInput() === 'AirPlay' || basicInfo.getCurrentInput() === 'Spotify') {
            var input = basicInfo.getCurrentInput();
            return yamaha.SendXMLToReceiver(
              '<YAMAHA_AV cmd="PUT"><' + input + '><Play_Control><Playback>Play</Playback></Play_Control></' + input + '></YAMAHA_AV>'
            );
          } else {
            return Q();
          }
        });
      });
    } else {
      return yamaha.powerOff(that.zone);
    }
  },

  getServices: function() {
    var that = this;
    var yamaha = this.yamaha;

    var informationService = this.accessory.getService(Service.AccessoryInformation);

    informationService
      .setCharacteristic(Characteristic.Name, this.name)
      .setCharacteristic(Characteristic.Manufacturer, "lg-rs232-tv")
      .setCharacteristic(Characteristic.Model, this.sysConfig.YAMAHA_AV.System[0].Config[0].Model_Name[0])
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version)
      .setCharacteristic(Characteristic.SerialNumber, this.sysConfig.YAMAHA_AV.System[0].Config[0].System_ID[0]);

    // for main zone Only
    if (this.zone === "Main_Zone") {
      // Party Mode switch

      var CinformationService = this.controlAccessory.getService(Service.AccessoryInformation);

      CinformationService
        .setCharacteristic(Characteristic.Name, this.unitName)
        .setCharacteristic(Characteristic.Manufacturer, "lg-rs232-tv")
        .setCharacteristic(Characteristic.Model, this.sysConfig.YAMAHA_AV.System[0].Config[0].Model_Name[0])
        .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version)
        .setCharacteristic(Characteristic.SerialNumber, this.sysConfig.YAMAHA_AV.System[0].Config[0].System_ID[0]);

      var mainSwitch = new Service.Switch("Main Power", UUIDGen.generate(this.unitName), this.unitName);
      mainSwitch
        .getCharacteristic(Characteristic.On)
        .on('get', function(callback, context) {
          yamaha.isOn().then(
            function(result) {
              debug("Main Power", result);
              callback(null, result);
            },
            function(error) {
              callback(error, false);
            }
          );
        })
        .on('set', function(powerOn, callback) {
          this.setPlaying(powerOn).then(function() {
            callback(null, powerOn);
          }, function(error) {
            callback(error, !powerOn); // TODO: Actually determine and send real new status.
          });
        }.bind(this));
      mainSwitch.isPrimaryService = true;
      this.controlAccessory.addService(mainSwitch);

      // Party Mode switch

      var partySwitch = new Service.Switch("Party", UUIDGen.generate("Party"), "Party");
      partySwitch
        .getCharacteristic(Characteristic.On)
        .on('get', function(callback) {
          this.yamaha.isPartyModeEnabled().then(function(result) {
            debug("getPartySwitch", that.zone, result);
            callback(null, result);
          });
        }.bind(this))
        .on('set', function(on, callback) {
          debug("setPartySwitch", that.zone, on);
          if (on) {
            const that = this;
            this.yamaha.powerOn().then(function() {
              that.yamaha.partyModeOn().then(function() {
                callback(null, true);
              });
            });
          } else {
            this.yamaha.partyModeOff().then(function() {
              callback(null, false);
            });
          }
        }.bind(this));
      this.controlAccessory.addService(partySwitch);

      // Radio Preset buttons

      if (this.radioPresets) {
        yamaha.getTunerPresetList().then(function(presets) {
          for (var preset in presets) {
            this.log("Adding preset %s - %s", preset, presets[preset].value, this.presetNum);
            if (!this.presetNum) {
              // preset by frequency
              var presetSwitch = new Service.Switch(presets[preset].value, UUIDGen.generate(presets[preset].value), presets[preset].value);
            } else {
              // preset by button
              var presetSwitch = new Service.Switch("Preset " + preset, UUIDGen.generate(preset), preset);
            }
            presetSwitch.context = {};

            presetSwitch.context.preset = preset;
            presetSwitch
              .getCharacteristic(Characteristic.On)
              .on('get', function(callback, context) {
                // debug("getPreset", this);
                yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
                  // debug('YamahaSwitch Is On', basicInfo.isOn()); // True
                  // debug('YamahaSwitch Input', basicInfo.getCurrentInput()); // Tuner

                  if (basicInfo.isOn() && basicInfo.getCurrentInput() === 'TUNER') {
                    yamaha.getTunerInfo().then(function(result) {
                      // console.log( 'TunerInfo', JSON.stringify(result,null, 0));
                      debug(result.Play_Info[0].Feature_Availability[0]); // Ready
                      debug(result.Play_Info[0].Search_Mode[0]); // Preset
                      debug(result.Play_Info[0].Preset[0].Preset_Sel[0]); // #
                      if (result.Play_Info[0].Feature_Availability[0] === 'Ready' &&
                        result.Play_Info[0].Search_Mode[0] === 'Preset' &&
                        result.Play_Info[0].Preset[0].Preset_Sel[0] === this.context.preset) {
                        callback(null, true);
                      } else {
                        callback(null, false);
                      }
                    }.bind(this));
                  } else {
                    // Off
                    callback(null, false);
                  }
                }.bind(this), function(error) {
                  callback(error);
                });
              }.bind(presetSwitch))
              .on('set', function(powerOn, callback) {
                // debug("setPreset", this);
                yamaha.setMainInputTo("TUNER").then(function() {
                  return yamaha.selectTunerPreset(this.context.preset).then(function() {
                    debug('Tuning radio to preset %s - %s', this.context.preset, this.displayName);
                    callback(null);
                  }.bind(this));
                }.bind(this));
              }.bind(presetSwitch));

            // debug("Bind", this, presetSwitch);
            this.controlAccessory.addService(presetSwitch);
          }
        }.bind(this)).bind(this);
      }
    }

    var zoneService = new Service.Television(this.name);
    debug("TV Zone name:", this.name);
    zoneService.setCharacteristic(Characteristic.ConfiguredName, this.name);
    zoneService.getCharacteristic(Characteristic.Active)
      .on('get', function(callback, context) {
        yamaha.isOn(that.zone).then(
          function(result) {
            debug("getActive", that.zone, result);
            callback(null, result);
          },
          function(error) {
            debug("getActive - error", that.zone, error);
            callback(error, false);
          }
        );
      })
      .on('set', function(powerOn, callback) {
        debug("setActive", that.zone, powerOn);
        this.setPlaying(powerOn).then(function() {
          callback(null, powerOn);
        }, function(error) {
          callback(error, !powerOn); // TODO: Actually determine and send real new status.
        });
      }.bind(this));

    // Populate ActiveIdentifier with current input selection

    yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
      debug('YamahaSwitch Is On', that.zone, basicInfo.isOn()); // True
      debug('YamahaSwitch Input', that.zone, basicInfo.getCurrentInput());

      // Set identifier for active input

      zoneService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(that.inputs.find(function(input) {
        return (input.ConfiguredName === basicInfo.getCurrentInput() ? input : false);
      }).Identifier);
    });

    zoneService
      .getCharacteristic(Characteristic.ActiveIdentifier)
      .on('get', function(callback) {
        // debug("getActiveIdentifier", that.zone);
        yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
          debug("getActiveIdentifier Input", that.zone, basicInfo.getCurrentInput());
          callback(null, that.inputs.find(function(input) {
            return (input.ConfiguredName === basicInfo.getCurrentInput() ? input : false);
          }).Identifier);
        });
        // callback(null);
      })
      .on('set', function(newValue, callback) {
        debug("setActiveIdentifier => setNewValue: ", that.zone, newValue);
        yamaha.setInputTo(that.inputs.find(function(input) {
          debug("find %s === %s", input.Identifier, newValue);
          return (input.Identifier === newValue ? input : false);
        }).ConfiguredName, that.zone).then(function(a, b) {
          debug("setActiveIdentifier", that.zone, a, b);
          callback();
        });
        // callback(null);
      });

    zoneService
      .getCharacteristic(Characteristic.RemoteKey)
      .on('set', function(newValue, callback) {
        debug("setRemoteKey: ", that.zone, newValue);
        if (this.cursorRemoteControl) {
          switch (newValue) {
            case Characteristic.RemoteKey.ARROW_UP:
              yamaha.remoteCursor("Up");
              break;
            case Characteristic.RemoteKey.ARROW_DOWN:
              yamaha.remoteCursor("Down");
              break;
            case Characteristic.RemoteKey.ARROW_RIGHT:
              yamaha.remoteCursor("Right");
              break;
            case Characteristic.RemoteKey.ARROW_LEFT:
              yamaha.remoteCursor("Left");
              break;
            case Characteristic.RemoteKey.SELECT:
              yamaha.remoteCursor("Sel");
              break;
            case Characteristic.RemoteKey.BACK:
              yamaha.remoteCursor("Return");
              break;
            case Characteristic.RemoteKey.INFORMATION:
              yamaha.remoteMenu("On Screen");
              break;
            case Characteristic.RemoteKey.PLAY_PAUSE:
              yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
                basicInfo.isMuted(that.zone) ? yamaha.muteOff(that.zone) : yamaha.muteOn(that.zone);
              });
              break;
            default:
          }
        } else {
          var option = util.mapKeyToControl(newValue);
          if (option) {
            debug("command", that.zone, newValue, option, this.pausePlay);
            yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
              if (basicInfo.getCurrentInput() === 'AirPlay' || basicInfo.getCurrentInput() === 'Spotify') {
                var input = basicInfo.getCurrentInput();
                yamaha.SendXMLToReceiver(
                  '<YAMAHA_AV cmd="PUT"><' + input + '><Play_Control><Playback>' + option + '</Playback></Play_Control></' + input + '></YAMAHA_AV>'
                );
              } else { // For non Spotify or Airplay sources perform Mute
                if (newValue === Characteristic.RemoteKey.PLAY_PAUSE) {
                  if (basicInfo.isMuted(that.zone)) {
                    debug("Mute Off: ", that.zone);
                    yamaha.muteOff(that.zone);
                  } else {
                    debug("Mute On : ", that.zone);
                    yamaha.muteOn(that.zone);
                  }
                } // end Mute functionality for non Spotify or Airplay sources
              }
            });
          }
        }
        callback(null);
      }.bind(this));

    zoneService
      .getCharacteristic(Characteristic.CurrentMediaState)
      .on('get', function(callback) {
        debug("getCurrentMediaState", that.zone);
        callback(null);
      })
      .on('set', function(newValue, callback) {
        debug("setCurrentMediaState => setNewValue: " + newValue);
        callback(null);
      });

    zoneService
      .getCharacteristic(Characteristic.TargetMediaState)
      .on('get', function(callback) {
        debug("getTargetMediaState", that.zone);
        callback(null);
      })
      .on('set', function(newValue, callback) {
        debug("setTargetMediaState => setNewValue: ", that.zone, newValue);
        callback(null);
      });

    zoneService
      .getCharacteristic(Characteristic.PictureMode)
      .on('set', function(newValue, callback) {
        debug("setPictureMode => setNewValue: ", that.zone, newValue);
        callback(null);
      });

    zoneService
      .getCharacteristic(Characteristic.PowerModeSelection)
      .on('set', function(newValue, callback) {
        debug("setPowerModeSelection => setNewValue: ", that.zone, newValue);
        callback(null);
      });

    this.accessory.addService(zoneService);

    that.inputs.forEach(function(input) {
      // Don't add Main Zone Sync for the Main zone
      if (this.zone !== "Main_Zone" || input.ConfiguredName !== "Main Zone Sync") {
        // debug("Adding input", input.ConfiguredName, "for zone", this.name);
        var inputService = new Service.InputSource(input.ConfiguredName, UUIDGen.generate(this.name + input.ConfiguredName), input.ConfiguredName);

        inputService
          .setCharacteristic(Characteristic.Identifier, input.Identifier)
          .setCharacteristic(Characteristic.ConfiguredName, input.ConfiguredTitle) // Use title instead of name
          .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
          .setCharacteristic(Characteristic.InputSourceType, input.InputSourceType)
          .getCharacteristic(Characteristic.TargetVisibilityState)
          .on('set', function(newValue, callback) {
            debug("setTargetVisibilityState => setNewValue: ", that.zone, newValue);
            inputService.getCharacteristic(Characteristic.CurrentVisibilityState).updateValue(newValue);
            callback(null);
          });

        // if sourcetype = App or the Title is different than name (custom name is created) make input visible by default
        if (input.InputSourceType !== 10 /* App */ && (input.ConfiguredName === input.ConfiguredTitle && input.ConfiguredName !== 'Main Zone Sync')) {
          debug("Making input", input.ConfiguredTitle, "invisible");
          inputService.getCharacteristic(Characteristic.CurrentVisibilityState).updateValue(1);
          inputService.getCharacteristic(Characteristic.TargetVisibilityState).updateValue(1);
        }

        // debug("Input service", inputService.displayName, inputService.UUID, inputService.subtype, input.ConfiguredTitle, input.ConfiguredName);

        zoneService.addLinkedService(inputService);
        this.accessory.addService(inputService);
        // debug(JSON.stringify(inputService, null, 2));
      }
    }.bind(this));

    var speakerService = new Service.TelevisionSpeaker(this.name);

    speakerService
      .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
      .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);
    // .setCharacteristic(Characteristic.Volume, 50);

    speakerService.getCharacteristic(Characteristic.Volume)
      .on('get', function(callback) {
        debug("get Volume", that.zone);
        callback(null);
      })
      .on('set', function(newValue, callback) {
        debug("set Volume => setNewValue: ", that.zone, newValue);
        callback(null);
      });

    yamaha.getBasicInfo(that.zone).then(function(basicInfo) {
      var v = basicInfo.getVolume() / 10.0;
      var p = 100 * ((v - that.minVolume) / that.gapVolume);
      p = p < 0 ? 0 : p > 100 ? 100 : Math.round(p);
      debug("Got volume percent of " + p + "%", that.zone);
      speakerService.getCharacteristic(Characteristic.Volume).updateValue(p);
    });

    speakerService.getCharacteristic(Characteristic.VolumeSelector)
      .on('set', function(newValue, callback) {
        var volume = speakerService.getCharacteristic(Characteristic.Volume).value;
        // debug(volume, speakerService.getCharacteristic(Characteristic.Volume));
        volume = volume + (newValue ? -1 : +1);
        speakerService.getCharacteristic(Characteristic.Volume).updateValue(volume);
        var v = ((volume / 100) * that.gapVolume) + that.minVolume;
        v = Math.round(v) * 10.0;
        debug("Setting volume to ", that.zone, v / 10);
        yamaha.setVolumeTo(v, that.zone).then(function(status) {
          debug("Status", that.zone, status);
        });
        debug("set VolumeSelector => setNewValue: ", that.zone, newValue, volume);
        callback(null);
      });

    this.accessory.addService(speakerService);
  }
};
