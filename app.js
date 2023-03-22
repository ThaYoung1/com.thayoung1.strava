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

  async post(body) {
    this.log('POST called met ' + JSON.stringify(body));

    const device = this.homey.drivers.getDriver('stravauser').getDevices().find(x => x.getData().id == body.owner_id);
    if (device){
      // Strava user device trigger detected
      if (body.object_type == 'activity'){
        let tokens;

        if (body.aspect_type == 'create' || body.aspect_type == 'update') {
          let store = await device.getStoreWithValidToken();
          let strava = new StravaAPI.client(store.token.access_token);
          let activity = await strava.activities.get({id: body.object_id});
          if (!activity.max_heartrate)
          activity.max_heartrate = 0
 
         if (!activity.average_heartrate)
          activity.average_heartrate = 0
 
         if (!activity.average_watts)
          activity.average_watts = 0
 
         if (!activity.suffer_score)
          activity.suffer_score = 0
 
         tokens = {
           id: body.object_id,
           name: activity.name,
           description: activity.description,
           type: activity.type,
           sport_type: activity.sport_type,
           start_date_local: activity.start_date_local, 
           distance: activity.distance,
           average_speed: activity.average_speed,
           max_speed: activity.max_speed,
           total_elevation_gain: activity.total_elevation_gain,
           average_watts: activity.average_watts,
           average_heartrate: activity.average_heartrate,
           max_heartrate: activity.max_heartrate,
           suffer_score: activity.suffer_score,
           elapsed_time: activity.elapsed_time,
           moving_time: activity.moving_time,
           pr_count: activity.pr_count,
           commute: activity.commute,
           private: activity.private,
           visibility: activity.visibility,
         };
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
