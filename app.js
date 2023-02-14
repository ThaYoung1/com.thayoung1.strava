'use strict';

//require('inspector').open(9229, '0.0.0.0')
const Homey = require('homey');

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
        const tokens = {
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
