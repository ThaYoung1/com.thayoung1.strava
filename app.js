'use strict';

const Homey = require('homey');
const StravaAPI = require('strava-v3');

if (process.env.DEBUG === '1') {
  require('inspector').open(9229, '0.0.0.0', false);
}

class StravaApp extends Homey.App {

  async onInit() { 
  }

  async get(query) {
    this.log('GET called met ' + JSON.stringify(query));

    var hub = new Object();
    hub["hub.challenge"] = query["hub.challenge"];
    
    return hub;
  }
  
  toTimeString(totalSeconds) {
    const totalMs = totalSeconds * 1000;
    const result = new Date(totalMs).toISOString().slice(11, 19);
  
    return result;
  }

  async post(body) {
    this.log('POST called met ' + JSON.stringify(body));

    const device = this.homey.drivers.getDriver('stravauser').getDevices().find(x => x.getData().id == body.owner_id);
    if (device){
      // Strava user device trigger detected
      if (body.object_type == 'activity'){
        let tokens = {};

        if (body.aspect_type == 'create' || body.aspect_type == 'update') {
          let store = await device.getStoreWithValidToken();
          let strava = new StravaAPI.client(store.token.access_token);
          let activity = await strava.activities.get({id: body.object_id});

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
          tokens.description = activity.description;
          tokens.type = activity.type;
          tokens.sport_type = activity.sport_type;
          tokens.start_date_local = activity.start_date_local;

          let end_date_local = new Date(activity.start_date_local);
          end_date_local.setSeconds(end_date_local.getSeconds() + activity.elapsed_time);
          tokens.end_date_local = end_date_local.toISOString();

          tokens.average_speed_ms = activity.average_speed;
          tokens.average_speed_kph = +(activity.average_speed * 3.6).toFixed(2);
          tokens.average_tempo_minkm = new Date(((1 / activity.average_speed) * 1000) * 1000).toISOString().substring(14, 19);
          
          tokens.max_speed = activity.max_speed;
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
            device.driver._activityCreated.trigger(device, tokens, null);
            break;
          case 'update':
            device.driver._activityUpdated.trigger(device, tokens, null);
            break;
          case 'delete':
            tokens = {
              id: body.object_id,
              event_time: body.event_time,
            }
            device.driver._activityDeleted.trigger(device, tokens, null);
            break;
        }
      }
      
    }
  }
} module.exports = StravaApp;
