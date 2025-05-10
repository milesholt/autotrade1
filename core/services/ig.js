// CONFIG

var actions = {};
const api=require('node-ig-api');
const util=require('util');

/* Login */

actions.login = function(){
  return new Promise((resolve, reject) => {
    api.login(true).then(r => resolve(r)).catch(e => reject(e));
  });
}

actions.loginLive = function(){

  console.log('Logging in live');

  process.env.IG_IDENTIFIER = process.env.IG_IDENTIFIER_LIVE;
  process.env.IG_PASSWORD = process.env.IG_PASSWORD_LIVE;
  process.env.IG_API_KEY = process.env.IG_API_KEY_LIVE;
  process.env.IG_DEMO = "FALSE";
  
  return new Promise((resolve, reject) => {
    api.login(true).then(r => resolve(r)).catch(e => {
      console.log(e.body.errorCode);
    });
  });
}

actions.loginDemo = function(){

  console.log('Logging in demo');

  process.env.IG_IDENTIFIER = process.env.IG_IDENTIFIER_DEMO;
  process.env.IG_PASSWORD = process.env.IG_PASSWORD_DEMO;
  process.env.IG_API_KEY = process.env.IG_API_KEY_DEMO;
  process.env.IG_DEMO = "TRUE";
  
  return new Promise((resolve, reject) => {
    api.login(true).then(r => resolve(r)).catch(e => {
      console.log(e.body.errorCode);
    });
  });
}


module.exports = {
  actions: actions,
  api: api
}
