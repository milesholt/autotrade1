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

module.exports = {
  actions: actions,
  api: api
}
