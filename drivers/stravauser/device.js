'use strict';

const Homey = require("homey");
const StravaAPI = require('strava-v3');

let strava;
let pollInterval;
let store;
let i = 1;

class StravaUserDevice extends Homey.Device {
  async onInit() {
    const settings = this.getSettings();

    this._apiRateLimitExceeded = this.homey.flow.getDeviceTriggerCard('api-rate-limit-exceeded');

    this._updateWeight = this.homey.flow.getActionCard('update-weight');
    this._updateWeight.registerRunListener(async (args, state) => {
      store = await this.getStoreWithValidToken();
      strava = new StravaAPI.client(store.token.access_token);
      let x = await strava.athlete.update({ weight: args.weight });
    });

    this._updateFTP = this.homey.flow.getActionCard('update-ftp');
    this._updateFTP.registerRunListener(async (args, state) => {
      store = await this.getStoreWithValidToken();
      strava = new StravaAPI.client(store.token.access_token);
      let x = await strava.athlete.update({ ftp: args.FTP });
    });

    if (process.env.DEBUG === '1') {
      this.onPoll();
    } else {
      pollInterval = this.homey.setInterval(this.onPoll.bind(this), settings.updateInterval * 1000);
    }
    
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
    store = await this.getStoreWithValidToken();
    strava = new StravaAPI.client(store.token.access_token);

    let athlete;
    try {
      athlete = await strava.athlete.get({});
    } catch (error) {
      if (error.response.statusCode = 429){
        // rate limit
        this.log(JSON.stringify(error));
      }
    }
   
    if (strava.rateLimiting.exceeded()){
      this._apiRateLimitExceeded.trigger(this);
    } else {
      await this.setCapability('meter_weight', athlete.weight);
      await this.setCapability('meter_ftp', athlete.ftp);
    }

    // Get all activities (per 200) so we can calculate total distances per type
    let activities;
    try {
      let done = false;
      let page = 1;
      let allActivities = [];

      while (done == false){
        activities = await strava.athlete.listActivities({
          before: Math.floor(Date.now() / 1000),
          after: 5918586,
          page: page,
          per_page: 200
        });

        allActivities = allActivities.concat(activities);
          
        if (activities.length < 200){
          let rideDistance = allActivities.filter(x => x.type == 'Ride' || x.type == 'VirtualRide' || x.type == 'EBikeRide' || x.type == 'MountainBikeRide').reduce((accumulator, activity) => {
            return accumulator + activity.distance;
          }, 0);
          let runDistance = allActivities.filter(x => x.type == 'Run' || x.type == 'VirtualRun').reduce((accumulator, activity) => {
            return accumulator + activity.distance;
          }, 0);
          let walkDistance = allActivities.filter(x => x.type == 'Walk').reduce((accumulator, activity) => {
            return accumulator + activity.distance;
          }, 0);

          await this.setCapability('meter_distance_ride', rideDistance / 1000);            
          await this.setCapability('meter_distance_run', runDistance / 1000);
          await this.setCapability('meter_distance_walk', walkDistance / 1000);

          done = true;
        } else {
          page++;            
        }
      }
    } catch (error) {
      this.log(JSON.stringify(error));
    }
  }

  async getStoreWithValidToken(){
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
    return store;
  }

  async setCapability(capability, value){
    if (value > 0){
      if (!this.hasCapability(capability)){
        await this.addCapability(capability).catch(this.error);
      }
      if (this.getCapabilityValue(capability) != value) {
        await this.setCapabilityValue(capability, value).catch(this.error);
      }  
    }
  }

}

module.exports = StravaUserDevice;