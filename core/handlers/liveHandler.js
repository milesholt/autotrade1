var actions = {};
var core;
var lib;
var loop;
var notification;
var api;
var monitor;
var util;
var log;
var lib;
var error;
var moment;

//Call specific service to handle ai actions
//const ai = require("../services/ai.js");

const strategy = required("./strategy2Handler2.js");

/*

REQUIRE

*/

actions.require = async function () {
  core = require.main.exports;
  lib = core.lib.actions;
  cloud = core.cloudHandler.actions;
  loop = core.loopHandler.actions.loop;
  notification = core.notificationHandler.actions;
  log = core.log.actions;
  api = core.api;
  check = core.checkHandler.actions;
  monitor = core.monitor.actions;
  error = core.errorHandler.actions;
  util = core.util;
  moment = core.moment;
};

action.doLive = async function(){
    //first login to live account
    console.log('Logging into live account');
    
  
    liveTickets.forEach(ticket => {
      const details = ticket.details;
      const set = ticket.set;
      await strategy.openPosition(details,set);
    });

    //log back into demo account
  
}
