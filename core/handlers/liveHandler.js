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
  trade = core.tradeHandler.actions;
  util = core.util;
  moment = core.moment;
};

actions.doLive = async function () {
  console.log('Logging into live account');

  try {
    const loginRes = await ig.actions.loginLive();
  } catch (err) {
    console.log('Error logging into live');
    return;
  }

  // Loop through tickets and open live positions
  for (const ticket of liveTickets) {
    try {
      await actions.openLivePosition(ticket);
    } catch (e) {
      console.error('Error opening position:', e.body.errorCode);
    }
  }

   liveTickets = [];
  console.log('liveTickets cleared');


  
  // Loop through tickets and open live positions
  for (const position of liveExtendPositions) {
    try {
      await actions.extendLivePosition(position);
    } catch (e) {
      console.error('Error extending live position:', e.body.errorCode);
    }
  }

  liveExtendPositions = [];
  console.log('liveExtendPositions cleared');
 
  // Log back into demo account
  try {
    const demoRes = await ig.actions.loginDemo();
    //console.log('Demo login success:', demoRes);
  } catch (e) {
    console.error('Demo login error:', e.body.errorCode);
  }
};

//Do any checks or get any details with live account pre-loop
actions.preLive = async function(){

  //For demo testing, disable live login, and get account balance from demo account and minimum sizes from stored values
  
  if(IS_LIVE){
    try {
      const loginRes = await ig.actions.loginLive();
    } catch (e) {
      console.log('Error logging into live', e.body.errorCode);
      return; // Exit early on login failure
    }
  }

  // Loop through tickets and open live positions
  for (const [idx, m] of markets.entries()) {
    //Get market details
    await api.epicDetails([m.epic]).then(async (r) => {

                //console.log(util.inspect(r, false, null));
            
                let minimumSize = r.marketDetails[0].dealingRules.minDealSize;
                let stopDistance = r.marketDetails[0].dealingRules.minNormalStopOrLimitDistance;

                markets[idx].minimumStop.value = stopDistance.value;
                //Disable to use fixed minimum sizes
                //markets[idx].minimumSize.value = minimumSize.value;
                markets[idx].minimumStop.type = String(stopDistance.unit).toLowerCase();
                markets[idx].minimumSize.type = String(minimumSize.unit).toLowerCase();

                console.log('epic: ' + markets[idx].epic + ' minSize: ' + markets[idx].minimumSize.value);

                console.log('PreLive - Live size and stop details should be updated for markets');
      
    }).catch(e => console.log(e.body.errorCode));
  }

  await api.acctInfo()
        .then((r)=> {
          accountBalance = r.accounts[0].balance.available;
          console.log('account balance: ' + accountBalance);
        }).catch(e => console.log(e.body.errorCode));

  
  
  // Log back into demo account
  if(IS_LIVE){
    try {
      const demoRes = await ig.actions.loginDemo();
    } catch (e) {
      console.error('Demo login error:', e.body.errorCode);
    }
  }
  
}

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
          await api.epicDetails([ticket.epic]).then(async (r) => {
            
                let minimumSize = r.marketDetails[0].dealingRules.minDealSize;
                let stopDistance = r.marketDetails[0].dealingRules.minNormalStopOrLimitDistance;
      
                market.minimumStop.value = stopDistance.value;
                market.minimumStop.type = String(stopDistance.unit).toLowerCase();
                market.minimumSize.value = minimumSize.value;
                market.minimumSize.type = String(minimumSize.unit).toLowerCase();

                console.log('live minimum size', minimumSize);
            
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

actions.extendLivePosition = async function (position) {  
  try{
    trade.determineAdjustPosition(position.dir, position.currentPrice, markets[position.marketId], position.thresholdLevel, true);
  } catch(err) { 
    console.log('Failed to extend live position');
    console.log(err);
  }
};

module.exports = {
  actions: actions,
};

