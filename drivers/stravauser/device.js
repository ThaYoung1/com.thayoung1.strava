'use strict';

const Homey = require("homey");
const StravaAPI = require('strava-v3');

let strava;
let pollInterval;
let store;

class StravaUserDevice extends Homey.Device {
  async onInit() {
    //const settings = this.getSettings();
    //store = this.getStore();

    //strava = new StravaAPI.client(store.token.access_token);

    //pollInterval = this.homey.setInterval(this.onPoll.bind(this), settings.updateInterval * 1000);
    //this.onPoll();
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
    this.log('all data from device: ' + this.getData());
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
    this.log('en dit is de opgeslagen token: ' + JSON.stringify(this.getStoreValue('token')));
  }

  async onPoll() {
    let athlete = await strava.athlete.listActivities({ 
      before: 1677968431,
      after: 1,
      page: 1,
      per_page: 200
    });
    let athlete2 = await strava.athlete.listActivities({ 
      before: 1677968431,
      after: 1,
      page: 2,
      per_page: 200
    });
    this.log(JSON.stringify(athlete));
  }

}

module.exports = StravaUserDevice;