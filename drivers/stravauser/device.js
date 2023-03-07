'use strict';

const Homey = require("homey");
const StravaAPI = require('strava-v3');

let strava;
let pollInterval;
let store;

class StravaUserDevice extends Homey.Device {
  async onInit() {
    const settings = this.getSettings();

    this._updateWeight = this.homey.flow.getActionCard('update-weight');
    this._updateWeight.registerRunListener(async (args, state) => {
      let x = await strava.athlete.update({ weight: args.weight });
    });

    this._updateFTP = this.homey.flow.getActionCard('update-functional-threshold-power');
    this._updateFTP.registerRunListener(async (args, state) => {
      let x = await strava.athlete.update({ ftp: args.FTP });
    });

    this.onPoll();
    pollInterval = this.homey.setInterval(this.onPoll.bind(this), settings.updateInterval * 1000);
  }

  async onAdded() {
    this.log('MyDevice has been added');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.find(key => key == 'updateInterval')){
      this.homey.clearInterval(pollInterval);
      pollInterval = this.homey.setInterval(this.onPoll.bind(this), newSettings.updateInterval * 1000);
    }
  }

  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  async onPoll() {
    store = this.getStore();
    
    // check access token validity
    if (store.token.expires_at * 1000 <= Date.now()){
      // refresh token
      StravaAPI.config({
        "access_token"  : store.token.access_token,
        "client_id"     : this.homey.settings.get('clientId'),
        "client_secret" : this.homey.settings.get('clientSecret'),
        "redirect_uri"  : "#",
      });
      const accessToken = await StravaAPI.oauth.refreshToken(store.token.refresh_token);

      this.setStoreValue('token', accessToken);
      store = this.getStore();
    }

    strava = new StravaAPI.client(store.token.access_token);
    let athlete = await strava.athlete.get({});
    if (!this.hasCapability('meter_weight')){
      await this.addCapability('meter_weight').catch(this.error);
    }
    if (this.getCapabilityValue('meter_weight') != athlete.weight) {
      await this.setCapabilityValue('meter_weight', athlete.weight).catch(this.error);
    }
  }

}

module.exports = StravaUserDevice;