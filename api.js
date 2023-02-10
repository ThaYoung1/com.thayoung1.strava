module.exports = {
    async get({ homey, query }) {
      // you can access query parameters like "/?foo=bar" through `query.foo`
      const result = await homey.app.get(query);
      return result;
    },

    async post({ homey, body }) {
        // access the post body and perform some action on it.
        homey.app.post(body)
        
        return null;
    },

    async put({ homey, params, body }) {
      // save config changes
      return homey.app.put(params, body);
    }
  };