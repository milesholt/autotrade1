
var actions = {};
var core;
var cloud;
var lib;
var moment;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  cloud = core.cloudHandler.actions;
  lib = core.lib.actions;
  moment = core.moment;
}

/*

START TRADE LOG

Log the start of a trade

*/

actions.startTradeLog = async function(epic, analysis, dealId){

  trades = await cloud.getFile(tradeDataDir);

  markets.forEach((market,i) => {
    if(market.epic == epic){
      let t = lib.deepCopy(trade);
      t.marketId = market.id;
      t.epic = epic;
      t.startAnalysis = analysis;
      t.start_timestamp = Date.now();
      t.start_date = moment().format('LLL');
      t.dealId = dealId;
      t.dealRef = dealRef;
      trades.push(t);
      market.deal = t;
    }
  });

  //update marketdata file
  cloud.updateFile(trades,tradeDataDir);

}


/*

CLOSE TRADE LOG

Log the end of a trade

*/

actions.closeTradeLog = async function(epic, closeAnalysis){

  let ca = closeAnalysis;

  let amount = (ca.openLevel - ca.lastClose) * size;
  let result = Math.sign(amount) === 1 ? 'PROFIT' : 'LOSS';

  ca.amount =  lib.toNumber(amount);
  ca.result =  result;

  markets.forEach((market,i) => {
    if(market.epic == epic){
      let t = trades[trades.length-1];
      console.log(trades.length);
      console.log(t);
      t.closeAnalysis = ca;
      t.end_timestamp = Date.now();
      t.end_date = moment().format('LLL');
      market.deal = {};
    }
  });

  accounts.push(ca);

  //update tradedata file
  cloud.updateFile(trades,tradeDataDir);

  //update marketdata file
  cloud.updateFile(markets,marketDataDir);

  //update account file
  cloud.updateFile(accounts,accountDataDir);

}


/*

DATA LOG

Log hourly analysis for market

*/

actions.dataLog = async function(analysis){
  markets.forEach((market,i) => {
    if(market.epic == epic){
      market.data = analysis;
    }
  });
}


/*

START MONITOR LOG

Log new monitor

*/

actions.startMonitorLog = async function(){

  console.log('starting monitor log');
  console.log('dealRef: ' + dealRef);
  console.log('epic: ' + epic);
  console.log('dealId: ' + dealId);
  console.log('direction: ' + direction);

  let m = lib.deepCopy(monitor);
  m.epic = epic;
  m.dealId =  dealId;
  m.dealRef = dealRef;
  m.streamLogDir = streamLogDir;
  monitors = await cloud.getFile(monitorDataDir);
  let exists = false;
  monitors.forEach((monitor,i) => {
    if(monitor.epic == epic) exists = true;
  });
  if(!exists) monitors.push(m);

  cloud.updateFile(monitors,monitorDataDir);
}

/*

GET MONITOR LOG

Get monitor log

*/

actions.getMonitorLog = async function(epic){
  monitors = await cloud.getFile(monitorDataDir);
  let r = false;
  return new Promise((resolve, reject) => {
      monitors.forEach((monitor,i) => {
        if(monitor.epic == epic) r = monitor;
      });
      if(!!r){
        console.log('found monitor record');
        console.log(monitor);
        resolve(r);
      } else{
        reject('Could not find monitor');
      }
    });
}


/*

CLOSE MONITOR LOG

Log new monitor

*/

actions.closeMonitorLog = async function(epic){
  monitors = await cloud.getFile(monitorDataDir);
  monitors.forEach((monitor,i) => {
    if(monitor.epic == epic){
      monitors.splice(i,1);
    }
  });
  cloud.updateFile(monitors,monitorDataDir);
}


/*

ERROR TRADE LOG

Record error log when making trade

*/

actions.errorTradeLog = async function(error,ref){

  trades = await cloud.getFile(tradeDataDir);

  markets.forEach((market,i) => {
    if(market.epic == epic){
      let t = lib.deepCopy(trade);
      t.marketId = market.id;
      t.epic = epic;
      t.startAnalysis = analysis;
      t.start_timestamp = Date.now();
      t.start_date = moment().format('LLL');
      t.dealRef = ref;
      t.error = error;
      trades.push(t);
    }
  });

  //update marketdata file
  cloud.updateFile(trades,tradeDataDir);

}

module.exports = {
  actions:actions
}
