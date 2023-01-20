module.exports = {
    async getSomething({ homey, query }) {
      // you can access query parameters like "/?foo=bar" through `query.foo`
      homey.log('GET called met ' + JSON.stringify(query));
      homey.log('GET called met ' + query.param);
      homey.log('GET called met ' + query["hub.challenge"]);

      // you can access the App instance through homey.app
      //const result = await homey.app.getSomething();
  
      // perform other logic like mapping result data
      var hub = new Object();
      hub["hub.challenge"] = query["hub.challenge"];
      var jsonString = JSON.stringify(hub);

      homey.log('json is ' + jsonString);

      return hub;
    },

    async addSomething({ homey, body }) {
        // access the post body and perform some action on it.
        homey.log('POST called met ' + JSON.stringify(body));
        homey.app.addSomething(body)
        
        return null;
    },
  };