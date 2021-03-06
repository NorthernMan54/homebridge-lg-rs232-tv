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

var Accessory, Service, Characteristic, Homebridge, UUIDGen;
// var inherits = require('util').inherits;
var debug = require('debug')('lg-rs232-tv');
var LgSerialPort = require('./lib/LgSerialPort').LgSerialPort;
var os = require("os");
var util = require('./lib/util.js');
// var Yamaha = require('yamaha-nodejs');
// var Q = require('q');
// var bonjour = require('bonjour')();
// var ip = require('ip');

var configuredAccessories = [];

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Homebridge = homebridge;
  UUIDGen = homebridge.hap.uuid;
  homebridge.registerPlatform("homebridge-lg-rs232-tv", "lg-rs232-tv", lgRS232Tv);
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
    var tvAccessory = new Accessory(device.name, uuid, Homebridge.hap.Accessory.Categories.TELEVISION);
    var tvAccessoryInfo = tvAccessory.getService(Service.AccessoryInformation);

    var hostname = os.hostname();
    tvAccessoryInfo
      .setCharacteristic(Characteristic.Manufacturer, "homebridge-lg-rs232-tv")
      .setCharacteristic(Characteristic.Model, device.type)
      .setCharacteristic(Characteristic.SerialNumber, hostname)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

    var tv = new LgTv(this, device, tvAccessory);
    // tvAccessory.configureCameraSource(cameraSource);
    tv.getServices();
    configuredAccessories.push(tvAccessory);
  }.bind(this));
  this.api.publishExternalAccessories("homebridge-lg-rs232-tv", configuredAccessories);
};

function LgTv(that, device, accessory) {
  this.log = that.log;
  this.device = device;
  this.accessory = accessory;
  this.inputs = util.Inputs;
  this.activeIdentifiers = [];
  this.serialPort = new LgSerialPort(device);
  this.refresh = this.device.refresh || 10;
  this.channel = null;

  setInterval(this.pollStatus.bind(this), this.refresh * 1000);
}

LgTv.prototype = {

  getServices: function() {
    var that = this;

    var informationService = this.accessory.getService(Service.AccessoryInformation);

    var hostname = os.hostname();

    informationService
      .setCharacteristic(Characteristic.Name, this.device.name)
      .setCharacteristic(Characteristic.Manufacturer, "lg-rs232-tv")
      .setCharacteristic(Characteristic.Model, this.device.type)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version)
      .setCharacteristic(Characteristic.SerialNumber, hostname);

    var zoneService = new Service.Television(this.device.name);
    debug("TV name:", this.device.name);
    zoneService.setCharacteristic(Characteristic.ConfiguredName, this.device.name);
    zoneService.getCharacteristic(Characteristic.Active)
      .on('set', function(powerOn, callback) {
        debug("setActive", this.device.name, powerOn);
        this.serialPort.power(powerOn, function(err, response) {
          debug("setActive: Response", err, response);
          callback(err, powerOn);
        });
      }.bind(this));

    // Populate ActiveIdentifier with current input selection

    zoneService
      .getCharacteristic(Characteristic.ActiveIdentifier)
      .on('set', function(newValue, callback) {
        debug("setActiveIdentifier: \"%s\" %s -> %s %s", this.device.name, zoneService
          .getCharacteristic(Characteristic.ActiveIdentifier).value, newValue, this.activeIdentifiers[newValue].ConfiguredName);
        if (this.activeIdentifiers[newValue].InputDeviceType === 1) {
          // Change Channel
          this.channel = newValue;
          if (zoneService
            .getCharacteristic(Characteristic.ActiveIdentifier).value > 0 && zoneService
            .getCharacteristic(Characteristic.ActiveIdentifier).value < 100) {
            // Must switch to Tuner prior to setting channel
            this.serialPort.input("00", function(err, response) {
              debug("setActiveIdentifier: Tuner Response", err, response);
              if (!err) {
                this.serialPort.channel(this.activeIdentifiers[newValue].LgRS232Command, function(err, response) {
                  debug("setActiveIdentifier: Channel Response", err, response);
                  callback(err, newValue);
                });
              } else {
                callback(err);
              }
            }.bind(this));
          } else {
            this.serialPort.channel(this.activeIdentifiers[newValue].LgRS232Command, function(err, response) {
              debug("setActiveIdentifier: Channel Response", err, response);
              callback(err, newValue);
            });
          }
        } else {
          this.serialPort.input(this.activeIdentifiers[newValue].LgRS232Command, function(err, response) {
            debug("setActiveIdentifier: Input Response", err, response);
            callback(err, newValue);
          });
        }
      }.bind(this));

    zoneService
      .getCharacteristic(Characteristic.RemoteKey)
      .on('set', function(newValue, callback) {
        debug("setRemoteKey: ", this.zone, newValue);
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

    // Station / Channels mapped to inputs

    var i = 100;
    this.device.stations.forEach(function(station) {
      this.inputs.push({
        ConfiguredName: "Station - " + station.station,
        Identifier: i++,
        InputDeviceType: 1, // Use the channel change commmand
        InputSourceType: 2,
        LgRS232Command: station.channel
      });
    }.bind(this));
    // Create inputs

    this.inputs.forEach(function(input) {
      // Don't add Main Zone Sync for the Main zone
      // debug("this", this.device, input);
      debug("Adding input", input.ConfiguredName, "for TV", this.device.name);
      this.activeIdentifiers[input.Identifier] = input;
      var inputService = new Service.InputSource(input.ConfiguredName, UUIDGen.generate(this.device.name + input.ConfiguredName), input.ConfiguredName);

      inputService
        .setCharacteristic(Characteristic.Identifier, input.Identifier)
        .setCharacteristic(Characteristic.ConfiguredName, input.ConfiguredName) // Use title instead of name
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.InputSourceType, input.InputSourceType)
        .getCharacteristic(Characteristic.TargetVisibilityState)
        .on('set', function(newValue, callback) {
          debug("setTargetVisibilityState => setNewValue: ", that.zone, newValue);
          inputService.getCharacteristic(Characteristic.CurrentVisibilityState).updateValue(newValue);
          callback(null);
        });

      zoneService.addLinkedService(inputService);
      this.accessory.addService(inputService);
      // debug(JSON.stringify(inputService, null, 2));
    }.bind(this));

    // Speaker / Volume

    var speakerService = new Service.TelevisionSpeaker(this.device.name);

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

    speakerService.getCharacteristic(Characteristic.VolumeSelector)
      .on('set', function(newValue, callback) {
        debug("VolumeSelector", newValue);
        callback(null);
      });

    this.accessory.addService(speakerService);
  }
};

LgTv.prototype.pollStatus = function() {
  debug("pollStatus: start", this.device.name);

  this.serialPort.powerStatus(function(err, response) {
    // debug("powerStatus: Response", response);
    // a 00 OK01
    // debug("powerStatus", this.accessory.getService(this.device.name).getCharacteristic(Characteristic.Active));
    if (err) {
      debug("powerStatus: Response", err.message);
      this.accessory.getService(this.device.name).getCharacteristic(Characteristic.Active).updateValue(err);
    } else if (response.substring(7, 9) === "01") {
      debug("powerStatus: Response \"%s\" -> %s", response, "On");
      this.accessory.getService(this.device.name).getCharacteristic(Characteristic.Active).updateValue(1);
    } else {
      debug("powerStatus: Response \"%s\" -> %s", response, "Off");
      this.accessory.getService(this.device.name).getCharacteristic(Characteristic.Active).updateValue(0);
    }
    // On check input or channel if the TV is on
    if (this.accessory.getService(this.device.name).getCharacteristic(Characteristic.Active).value) {
      this.serialPort.inputStatus(function(err, response) {
        if (err) {
          debug("inputStatus: Response", err.message, response);
          this.accessory.getService(this.device.name).getCharacteristic(Characteristic.ActiveIdentifier).updateValue(err);
        } else if (response.substring(7, 9) === "00" && this.channel) {
          debug("inputStatus: Response \"%s\" -> %s", response, "Tuner", this.channel);
          // Watching TV
          this.accessory.getService(this.device.name).getCharacteristic(Characteristic.ActiveIdentifier).updateValue(this.channel);
        } else {
          debug("inputStatus: Response \"%s\" -> %s", response, _getIdentifier(this.inputs, response.substring(7, 9)));
          // debug("ActiveIdentifier: Input Response", this.inputs, input);
          // debug("ActiveIdentifier: Input Response", _getIdentifier(this.inputs, response.substring(7, 9)));

          this.accessory.getService(this.device.name).getCharacteristic(Characteristic.ActiveIdentifier).updateValue(_getIdentifier(this.inputs, response.substring(7, 9)));
          debug("ActiveIdentifier: %s -> \"%s\"", this.accessory.getService(this.device.name).getCharacteristic(Characteristic.ActiveIdentifier).value, this.activeIdentifiers[this.accessory.getService(this.device.name).getCharacteristic(Characteristic.ActiveIdentifier).value].ConfiguredName);
        }
      }.bind(this));
    }
  }.bind(this));
};

function _getIdentifier(inputs, LgRS232Command) {
  for (const input of inputs) {
    // debug("_getIdentifier %s === %s", _asciiToHexa(input.LgRS232Command), _asciiToHexa(LgRS232Command));
    if (input.LgRS232Command === LgRS232Command) {
      return (input.Identifier);
    }
  }
  return (new Error("Invalid RS232 option " + LgRS232Command));
}
