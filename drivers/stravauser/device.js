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

    // temporary settings fix for upping settings older versions of App with too low setting
    if (settings.updateInterval < 900) {
      await this.setSettings({ updateInterval: 900 });
    }
    
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
    
    var d = new Date().toLocaleString(this.homey.i18n.getLanguage(), { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'})
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

  async upsertActivity(body){
    // Strava user device trigger detected
    if (body.object_type == 'activity'){
      let tokens = {};

      if (body.aspect_type == 'create' || body.aspect_type == 'update') {
        let store = await this.getStoreWithValidToken();
        let strava = new StravaAPI.client(store.token.access_token);
        let activity = await strava.activities.get({id: body.object_id});
        this.log('activity: ' + JSON.stringify(activity) + body.aspect_type);

        if (typeof activity.distance !== 'number') {
          tokens.distance_m = 0;
          tokens.distance_km = 0;  
        } else {
          tokens.distance_m = activity.distance;
          tokens.distance_km = +(activity.distance / 1000).toFixed(2);
        }

        if (typeof activity.max_heartrate !== 'number') {
          tokens.max_heartrate = 0 
        } else {
          tokens.max_heartrate = activity.max_heartrate;
        }

        if (typeof activity.average_heartrate !== 'number') {
          tokens.average_heartrate = 0 
        } else { 
          tokens.average_heartrate = activity.average_heartrate;
        }

        if (typeof activity.average_watts !== 'number') {
          tokens.average_watts = 0
        } else {
          tokens.average_watts = activity.average_watts;
        }

        if (typeof activity.suffer_score !== 'number') {
          tokens.suffer_score = 0
        } else {
          tokens.suffer_score = activity.suffer_score;
        }

        tokens.id = body.object_id;
        tokens.name = activity.name;
        if (activity.description != null){
          tokens.description = activity.description;
        } else {
          tokens.description = '';
        }
        tokens.type = activity.type;
        tokens.sport_type = activity.sport_type;

        const options = {
          weekday: 'long', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit'
        }
        tokens.start_date_local = new Date(activity.start_date_local).toLocaleString(this.homey.i18n.getLanguage(), options);
        tokens.start_time_local_hh_mm_ss = new Date(activity.start_date_local).toISOString().substring(11, 19);
        tokens.start_time_local_hh_mm = new Date(activity.start_date_local).toISOString().substring(11, 16);
        
        let end_date_local = new Date(activity.start_date_local);
        end_date_local.setSeconds(end_date_local.getSeconds() + activity.elapsed_time);
        tokens.end_date_local = end_date_local.toLocaleString(this.homey.i18n.getLanguage(), options);
        tokens.end_time_local_hh_mm_ss = end_date_local.toISOString().substring(11, 19);
        tokens.end_time_local_hh_mm = end_date_local.toISOString().substring(11, 16);
        tokens.average_speed_ms = +(activity.average_speed).toFixed(2);
        tokens.average_speed_kph = +(activity.average_speed * 3.6).toFixed(2);
        if (activity.average_speed > 0){
          tokens.average_tempo_minkm = new Date(((1 / activity.average_speed) * 1000) * 1000).toISOString().substring(14, 19);
        } else {
          tokens.average_tempo_minkm = '00:00';
        }
        
        tokens.max_speed_ms = +(activity.max_speed).toFixed(2);
        tokens.max_speed_kph = +(activity.max_speed * 3.6).toFixed(2);

        tokens.total_elevation_gain = activity.total_elevation_gain;

        tokens.elapsed_time_s = activity.elapsed_time;
        tokens.elapsed_time_hh_mm_ss = this.toTimeString(activity.elapsed_time);

        tokens.moving_time_s = activity.moving_time;
        tokens.moving_time_hh_mm_ss = this.toTimeString(activity.moving_time);

        tokens.pr_count = activity.pr_count;
        tokens.commute = activity.commute;
        tokens.private = activity.private;
        tokens.visibility = activity.visibility;
      }

      switch (body.aspect_type){
        case 'create':
          this.driver._activityCreated.trigger(this, tokens, null);
          break;
        case 'update':
          this.driver._activityUpdated.trigger(this, tokens, null);
          break;
        case 'delete':
          tokens = {
            id: body.object_id,
            event_time: body.event_time,
          }
          this.driver._activityDeleted.trigger(this, tokens, null);
          break;
      }
    }
  }

  toTimeString(totalSeconds) {
    const totalMs = totalSeconds * 1000;
    const result = new Date(totalMs).toISOString().slice(11, 19);
  
    return result;
  }

}

module.exports = StravaUserDevice;