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

   //Test login switch
   await ig.actions.loginLive()
    .then((r) => console.log(r))
    .catch((e) => console.log(e));
  

    liveTickets.forEach(ticket => {
      const details = ticket.details;
      const set = ticket.set;
      await actions.openLivePosition(details,set);
    });

    //log back into demo account
    await ig.actions.loginDemo()
    .then((r) => console.log(r))
    .catch((e) => console.log(e));
  
}


actions.openLivePosition = async function(){

  console.log('Opening live position');

  const ticket = {
      currencyCode: "GBP",
      direction: details.direction,
      epic: set.epic,
      expiry: markets[set.marketidx].expiry,
      size: details.size.toFixed(2),
      forceOpen: true,
      orderType: "MARKET",
      level: null,
      limitDistance: details.limitDistance.toFixed(2),
      limitLevel: null,
      stopDistance: details.stopDistance.toFixed(2),
      stopLevel: null,
      guaranteedStop: false,
      timeInForce: "FILL_OR_KILL",
      trailingStop: null,
      trailingStopIncrement: null,
    };

    await api
      .deal(ticket)
      .then(async (r) => {
        console.log(util.inspect(r, false, null));
      }).catch((e) => console.log(e));
    
}
