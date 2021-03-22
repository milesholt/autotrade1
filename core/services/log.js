
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

  let a = lib.deepCopy(analysis);
  delete a.pricedata;

  markets.forEach((m,i) => {
    if(m.epic == epic){
      let t = lib.deepCopy(trade);
      t.marketId = market.id;
      t.epic = epic;
      t.startAnalysis = a;
      t.start_timestamp = Date.now();
      t.start_date = moment().format('LLL');
      t.dealId = dealId;
      t.dealRef = dealRef;
      t.direction = direction;

      console.log(t);
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

  if(!ca.amount && !ca.result){
    let v = ca.direction == 'BUY' ? (ca.lastClose - ca.openLevel) : (ca.openLevel - ca.lastClose);
    let amount = v * size;
    if(ca.profit !== null){ amount = ca.profit;  } else { console.log('No profit on closeAnalysis, going with own calculation.'); }
    let result = Math.sign(amount) === 1 ? 'PROFIT' : 'LOSS';

    ca.amount =  lib.toNumber(amount);
    ca.result =  result;
  }

  ca.epic = epic;

  let mid_tmp = 0;

  console.log('Closing trade log, looping through markets:');

  markets.forEach(async (market,i) => {
    if(market.epic == epic){
      console.log('Found market with epic: ' + epic);
      mid_tmp = market.id;
      console.log('Market MID is: ' + mid_tmp );
    }
  });

  markets[mid_tmp].deal = {};

  const tradeDataDir_tmp = 'core/data/'+epic+'/'+epic+'_tradedata.json';
  let trades_tmp = await cloud.getFile(tradeDataDir_tmp);
  let t = trades_tmp[trades_tmp.length-1];
  t.closeAnalysis = ca;
  t.end_timestamp = Date.now();
  t.end_date = moment().format('LLL');

  accounts = await cloud.getFile(accountDataDir);
  accounts.push(ca);

  //update tradedata file
  cloud.updateFile(trades_tmp,tradeDataDir_tmp);

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
  market.data = analysis;
}


/*

START MONITOR LOG

Log new monitor

*/

actions.startMonitorLog = async function(dealId){

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
  m.direction = direction;
  monitors = await cloud.getFile(monitorDataDir);
  let exists = false;
  let isChanged =  false;
  monitors.forEach((monitor,i) => {
    if(monitor.epic == m.epic){
      console.log('epics match, epic: ' + m.epic + ' monitor epic: ' + monitor.epic);
      exists = true;
      if(monitor.dealId !== m.dealId){
        console.log('Monitor has found epic ' + m.epic + ', but with a different dealId, replacing with:');
        console.log(m);
        monitors.splice(i,1);
        exists = false;
        isChanged = true;
      }
    }
  });
  console.log(exists);
  if(exists == false){
    console.log('Monitor does not exist, adding. Exists is: ' + exists);
    monitors.push(m);
    isChanged = true;
  }

  if(isChanged == true){
    console.log('monitor has changed, updating...');
    cloud.updateFile(monitors,monitorDataDir);
  }
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
  console.log('closeMonitorLog');
  console.log('path: ' + monitorDataDir);
  console.log(epic);
  monitors = await cloud.getFile(monitorDataDir);
  monitors.forEach((monitor,i) => {
    console.log(monitor);
    if(monitor.epic == epic){
      console.log('found monitor with epic: ' + epic + ', removing from log.');
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

  let errors = await cloud.getFile(errorDataDir);

  let a = lib.deepCopy(analysis);
  delete a.pricedata;

  markets.forEach((market,i) => {
    if(market.epic == epic){
      let e = lib.deepCopy(trade);
      e.marketId = market.id;
      e.epic = epic;
      e.startAnalysis = a;
      e.start_timestamp = Date.now();
      e.start_date = moment().format('LLL');
      e.dealRef = ref;
      e.error = error;
      errors.push(e);
    }
  });

  //update marketdata file
  cloud.updateFile(errors,errorDataDir);

}

module.exports = {
  actions:actions
}
