'use strict';

const Homey = require('homey');
const formdata = require('form-data');
const fetch = require('node-fetch');

let clientId;
let clientSecret;
let homeyId;
let athlete;

class StravaUserDriver extends Homey.Driver  {

  async onInit(){
    this.log('onInit');

    //this.homey.settings.set('clientId', null);
    //this.homey.settings.set('clientSecret', null);
    this.clientId = this.homey.settings.get('clientId');
    this.clientSecret = this.homey.settings.get('clientSecret');

    this.homeyId = await this.homey.cloud.getHomeyId();

    this._activityCreated = this.homey.flow.getDeviceTriggerCard('activity-created');
    this._activityUpdated = this.homey.flow.getDeviceTriggerCard('activity-updated');
    this._activityDeleted = this.homey.flow.getDeviceTriggerCard('activity-deleted');
  }
  
  delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  async initOAuth2(session){
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=https://callback.athom.com/oauth2/callback/&scope=profile:read_all,profile:write,activity:read_all,activity:write`;
    let myOAuth2Callback = await this.homey.cloud.createOAuth2Callback(authUrl);
			myOAuth2Callback
				.on('url', url => {
          this.log('myOAuth2Callback on url');
					// dend the URL to the front-end to open a popup
          this.delay(1000).then(() => session.emit('url', url));
					//session.emit('url', url);
				})
				.on('code', code => {
          this.log('myOAuth2Callback on code');
					// ... swap your code here for an access token
          const formNewSub = new formdata();
          formNewSub.append('client_id', this.clientId);
          formNewSub.append('client_secret', this.clientSecret); 
          formNewSub.append('code', code);
          formNewSub.append('grant_type', 'authorization_code');
          const reqNewSubOptions = {
            method: 'POST',
            body: formNewSub
          };
          fetch('https://www.strava.com/api/v3/oauth/token', reqNewSubOptions)
          .then(response => response.json())
          .then(data => {
            this.log('myOAuth2Callback Strava authorization_code switched, response: ' + JSON.stringify(data));
            athlete = data;
   					// tell the front-end we're done
            this.log('myOAuth2Callback authorizaed');
            session.emit('authorized');
           });
				})
  }

  async onPair(session){
    this.log('onPair');

    session.setHandler('login_oauth2', async() => {
      this.log('oauth2 handler!');
    });

    session.setHandler('connection_setup', async () =>
    {
      if (!this.clientId){ return { ok: false, err: 'Client ID missing' }; }
      if (!this.clientSecret){ return { ok: false, err: 'Client Secret missing' }; }

      // Check if Webhook is already ok
      let wh = await this.getWebhook();
      if (wh.ok){
        // check if webhook is set
        if (wh.data){
          // there is a webhook available, check callback url 
          if (!wh.callback_url == `https://${this.homeyId}.connect.athom.com/api/app/${this.homey.app.id}`){
            // callback url not correct, recreate
            let whDel = await this.deleteWebhook(wh.data.id);
            let whNew = await this.createWebhook();
          } else {
            // callback url is correct, proceed to oAuth2 step
            await this.initOAuth2(session);
            return { ok: true, data: wh.data };
          }
        } else {
          // there is no webhook available, create one
          let whNew = await this.createWebhook();
          return { ok: true, data: whNew.data };
        }        
      } else {
        // error, probably 401 unauthorized
        return { ok: false, data: wh.data, clientId: this.clientId, clientSecret: this.clientSecret };
      }
    });

    session.setHandler("init_webhook", async (data) => {
      this.log('handler init_webhook');

      if (!data.clientId){ return { ok: false, err: 'Client ID missing' }; }
      if (!data.clientSecret){ return { ok: false, err: 'Client Secret missing' }; }

      this.clientId = data.clientId;
      this.clientSecret = data.clientSecret;
      this.homey.settings.set('clientId', data.clientId);
      this.homey.settings.set('clientSecret', data.clientSecret);

      // Check if Webhook is already ok
      let wh = await this.getWebhook();
      if (wh.ok){
        // check if webhook is set
        if (wh.data){
          // there is a webhook available, check callback url 
          if (!wh.callback_url == `https://${this.homeyId}.connect.athom.com/api/app/${this.homey.app.id}`){
            // callback url not correct, recreate
            let whDel = await this.deleteWebhook(wh.data.id);
            let whNew = await this.createWebhook();
          } else {
            // callback url is correct, proceed to oAuth2 step
            await this.initOAuth2(session);
            return { ok: true, data: wh.data };
          }
        } else {
          // there is no webhook available, create one
          let whNew = await this.createWebhook();
          return { ok: true, data: whNew.data };
        }        
      } else {
        // error, probably 401 unauthorized
        return { ok: false, data: wh.data };
      }
    });
            
    session.setHandler("list_devices", async () => {
      this.log('list_devices');
      this.log('token ' + JSON.stringify(athlete));

      return [{
        name: athlete.athlete.firstname + ' ' + athlete.athlete.lastname,
        data: {
          id: athlete.athlete.id,
        },
        store: {
          token: athlete,
        }
      }]
    });
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    this.log('onPairListDevices');
  }

  /* #region Webhook calls */
  async getWebhook(){
    this.log('getWebhook');
    let result = { ok: false, data: 'init'} ;

    const resp = await fetch(`https://www.strava.com/api/v3/push_subscriptions?client_id=${this.clientId}&client_secret=${this.clientSecret}`, {
      method: 'GET',
    })
    .then((response) => {
      if (response.ok){
        this.log('getWebhook ok: ' + response.status);
        return response.json();
      } else {
        this.log('getWebhook nok: ' + response.status);
        throw ({ ok: false, data: response });
      }
    })
    .then((data) => {
        this.log('getWebhook response ok, data: ' + JSON.stringify(data));
        result = { ok: true, data: data[0] };
    })
    .catch((error) => {      
        this.log('getWebhook error: ' + JSON.stringify(error));
        result = { ok: false, data: error};
    });
    
    return result;
  }

  async createWebhook(){
    this.log('createWebhook');
    let result = { ok: false, data: 'init'};
    
    // create a new subscription
    const fd = new formdata();
    fd.append('client_id', this.clientId);
    fd.append('client_secret', this.clientSecret); 
    fd.append('callback_url', `https://${this.homeyId}.connect.athom.com/api/app/${this.homey.app.id}`);
    fd.append('verify_token', 'OK');
    const reqNewSubOptions = {
      method: 'POST',
      body: fd
    };
    
    await fetch('https://www.strava.com/api/v3/push_subscriptions', reqNewSubOptions)
    .then(response => {
      if (!response.ok){
        throw ({ ok: false, data: response });
      } 
      return response.json()
    })
    .then(data => {
      this.log('createWebhook json data: ' + JSON.stringify(data));
      result = { ok: true, data: data };
    })
    .catch((error) => {
      this.log('createWebhook error: ' + JSON.stringify(error));
      result = { ok: false, data: error };
    });

    return result;
  }
  async deleteWebhook(id){
    // delete subscription 
    this.log('deleteWebhook ' + id);
    let result = { ok: false, data: 'init'};
    
    const fd = new formdata();
    fd.append('client_id', this.clientId);
    fd.append('client_secret', this.clientSecret); 

    const requestOptions = {
      method: 'DELETE',
      body: fd };
    fetch(`https://www.strava.com/api/v3/push_subscriptions/${id}`, requestOptions)
    .then(resp => resp.text())
    .then(data => {
      this.log('deleteWebhook data: ' + JSON.stringify(data));
      result = data
    })
    .catch((error) => {
      this.log('deleteWebhook error: ' + JSON.stringify(error));
      result = { ok: false, data: error };
    });

    return data;
  }
}
/* #endregion */

module.exports = StravaUserDriver;
