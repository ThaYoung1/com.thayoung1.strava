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

        /*
        let store = device.getStore();
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
        */
        let store = await device.getStoreWithValidToken();
        let strava = new StravaAPI.client(store.token.access_token);
        let activity = await strava.activities.get({id: body.object_id});

        const tokens = {
          average_speed: activity.average_speed,
          name: activity.name,
          distance: activity.distance,
          
          object_type: body.object_type,
          object_id: body.object_id,
          aspect_type: body.aspect_type,
          updates: JSON.stringify(body.updates),
          owner_id: body.owner_id,
          event_time: body.event_time
        };

        switch (body.aspect_type){
          case 'create':
            device.driver._activityCreated.trigger(device, tokens, null);
            break;
          case 'update':
            device.driver._activityUpdated.trigger(device, tokens, null);
            break;
          case 'delete':
            device.driver._activityDeleted.trigger(device, tokens, null);
            break;
        }
      }
      
    }
  }

  async put(homey, params, body) {
    this.log('PUT functie logt ook');

    return true;
  }

} module.exports = StravaApp;
