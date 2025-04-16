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
const ig = require("../services/ig.js");

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

actions.doLive = async function () {
  console.log('Logging into live account');

  try {
    const loginRes = await ig.actions.loginLive();
    //console.log('Live login success:', loginRes);
  } catch (err) {
    console.error('Live login error:', err);
    return; // Exit early on login failure
  }

  // Loop through tickets and open live positions
  for (const ticket of liveTickets) {
    //const { details, set } = ticket;
    try {
      await actions.openLivePosition(ticket);
    } catch (err) {
      console.error('Error opening position:', err);
    }
  }

  liveTickets = [];
  console.log('liveTickets cleared');

  // Log back into demo account
  try {
    const demoRes = await ig.actions.loginDemo();
    //console.log('Demo login success:', demoRes);
  } catch (err) {
    console.error('Demo login error:', err);
  }
};

actions.openLivePosition = async function (ticket) {

  console.log('Opening live position for', ticket.epic);

  console.log(ticket);

  /*const ticket = {
    currencyCode: "GBP",
    direction: details.direction,
    epic: set.epic,
    expiry: markets[set.marketidx].expiry, // Assumes 'markets' is globally defined
    size: parseFloat(details.size).toFixed(2),
    forceOpen: true,
    orderType: "MARKET",
    level: null,
    limitDistance: parseFloat(details.limitDistance).toFixed(2),
    limitLevel: null,
    stopDistance: parseFloat(details.stopDistance).toFixed(2),
    stopLevel: null,
    guaranteedStop: false,
    timeInForce: "FILL_OR_KILL",
    trailingStop: null,
    trailingStopIncrement: null,
  };*/

  try {
    const response = await api.deal(ticket);
    console.log('Position response:', util.inspect(response, false, null));

    //Handle errors if failed to open ticket 
    if (!response.confirms.dealId) {
          console.log("Error: " + response.confirms.errorCode);
          if(response.confirms.errorCode == 'error.confirms.deal-not-found'){
            console.log('Could not confirm deal when opening on live');
          }
    }

    if(response.confirms.dealStatus == 'REJECTED'){
      if(response.confirms.reason == 'MINIMUM_ORDER_SIZE_ERROR'){
          //Minumum sizes can be different on live account, so update minimum size and try again
          await api.epicDetails([epic]).then(async (r) => {
                let minimumSize = r.marketDetails[0].dealingRules.minDealSize;
                ticket.size = minimumSize;
                console.log('Trying again with live minimum size');
                try {
                    const response = await api.deal(ticket);
                    console.log('Position response:', util.inspect(response, false, null));
                } catch (err) {
                    console.error('Deal error:', err);
                    throw err; // re-throw so it can be caught upstream
                }
          }).catch(e => console.log(e));
      }         
    }
    
  } catch (err) {
    console.error('Deal error:', err);
    throw err; // re-throw so it can be caught upstream
  }
};

module.exports = {
  actions: actions,
};

