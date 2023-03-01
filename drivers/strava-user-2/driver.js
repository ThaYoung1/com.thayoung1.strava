'use strict';

const { Driver } = require('homey');
const formdata = require('form-data');
const fetch = require('node-fetch');

let clientId;
let clientSecret;
let homeyId;
let athlete;

class MyDriver extends Driver {

  async onInit() {
    this.log('MyDriver has been initialized');

    this.clientId = this.homey.settings.get('clientId');
    this.clientSecret = this.homey.settings.get('clientSecret');
    this.homeyId = await this.homey.cloud.getHomeyId();

    this._activityCreated = this.homey.flow.getDeviceTriggerCard('device_activity_created');
    this._activityUpdated = this.homey.flow.getDeviceTriggerCard('device_activity_updated');
    this._activityDeleted = this.homey.flow.getDeviceTriggerCard('device_activity_deleted');
  }

  async initOAuth2(session){
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=https://callback.athom.com/oauth2/callback/&scope=activity:read_all,profile:read_all`; 
    let myOAuth2Callback = await this.homey.cloud.createOAuth2Callback(authUrl);
			myOAuth2Callback
				.on('url', url => {
          this.log('myOAuth2Callback on url');
					// dend the URL to the front-end to open a popup
					session.emit('url', url);
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

  delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  async onPair(session) {

    let apiKey = '102070';
    let privateKey = '852fd2450a04a34d622d98f1eb8886238c5fe61d';

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${apiKey}&response_type=code&redirect_uri=https://callback.athom.com/oauth2/callback/&scope=activity:read_all,profile:read_all`; 
    let myOAuth2Callback = await this.homey.cloud.createOAuth2Callback(authUrl);

    myOAuth2Callback
      .on('url', url => {
        this.log('myOAuth2Callback on url');
        // dend the URL to the front-end to open a popup
        this.delay(1000).then(() => session.emit('url', url));
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



    session.setHandler("login", async (data) => {
      let apiKey = '102070';
      let privateKey = '852fd2450a04a34d622d98f1eb8886238c5fe61d';

      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${apiKey}&response_type=code&redirect_uri=https://callback.athom.com/oauth2/callback/&scope=activity:read_all,profile:read_all`; 
      let myOAuth2Callback = await this.homey.cloud.createOAuth2Callback(authUrl);
        myOAuth2Callback
          .on('url', url => {
            this.log('myOAuth2Callback on url');
            // dend the URL to the front-end to open a popup
            session.emit('url', url);
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

      return true;
    });

    session.setHandler("list_devices", async () => {
      balance = await kraken.api('Balance');
      assetPairs = Object.values(assetPairs.result);

      return {
        name: 'Kraken API',
        data: {
          id: Date.now(),
        },
        settings: {
          // Store username & password in settings
          // so the user can change them later
          apiKey,
          privateKey,
        },
      };

    });
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

}

module.exports = MyDriver;
