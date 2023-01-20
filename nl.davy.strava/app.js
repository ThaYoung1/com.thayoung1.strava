'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');
  }

  async getSomething() {
    this.log('App functie logt ook');

    return 'ok';
  }

  async addSomething(body) {
    const webhookTrigger = this.homey.flow.getTriggerCard('webhook_event');

    const tokens = {
      object_type: body.object_type,
      object_id: body.object_id,
      aspect_type: body.aspect_type,
      //updates: JSON.stringify(body.updates),
      owner_id: body.owner_id,
      event_time: body.event_time
    };

    await webhookTrigger.trigger(tokens);
  }

}

module.exports = MyApp;
