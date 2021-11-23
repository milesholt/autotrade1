
var actions = {};
var core;
var cloud;
var lib;
var moment;
var fs;
/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  cloud = core.cloudHandler.actions;
  lib = core.lib.actions;
  moment = core.moment;
  fs =  core.fs;
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
      t.openLevel = a.openLevel;
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
  markets[mid_tmp].tradedBefore = moment().valueOf();

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

ANALYSIS LOG

Update analysisDataSet log onto cloud

If dataSet reaches a maximum of 36 hours, delete the first

*/


actions.analysisLog = async function(data){

  delete data.pricedata;

  if(analysisDataSet.length == 36) analysisDataSet.shift();

  console.log('ticket info:');
  console.log(data.ticket);

  analysisDataSet.push(data);

  let analysis = 'var analysis_'+market.id+'='+JSON.stringify(analysisDataSet);
  cloud.updateFile(analysis,analysisDataDir);
}

/* PLOT

Update plotDataSet log onto cloud

*/

actions.plotLog = async function(data){



  if(plotDataSet.length == 36) plotDataSet.shift();
  plotDataSet.push(data);

  let plots = 'var plots_'+market.id+'='+JSON.stringify(plotDataSet);
  cloud.updateFile(plots,plotDataDir);
}


actions.plotLog4Hour = async function(data){

  if(plot4HourDataSet.length == resolutionPointsLimit_4Hours) plot4HourDataSet.shift();
  plot4HourDataSet.push(data);

  let plots = 'var plots_4hour_'+market.id+'='+JSON.stringify(plot4HourDataSet);
  cloud.updateFile(plots,plot4HourDataDir);
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

actions.startMonitorLog = async function(monitorData){

  console.log('starting monitor log: ' + monitorData.epic);
  // console.log('dealRef: ' + dealRef);
  // console.log('epic: ' + epic);
  // console.log('dealId: ' + dealId);
  // console.log('direction: ' + direction);
  //
 //let monitorKeyData = lib.deepCopy(monitor);
  // monitorKeyData.epic = epic;
  // monitorKeyData.dealId =  dealId;
  // monitorKeyData.dealRef = dealRef;
  // monitorKeyData.streamLogDir = streamLogDir;
  // monitorKeyData.direction = direction;
  //
  // //m.map((item, i) => Object.assign({}, item, monitorData));
  // let m = {...monitorKeyData, ...monitorPositionData};

  let monitorKeys = lib.deepCopy(monitor);
  var m = {...monitorKeys, ...monitorData};


  //monitors = await cloud.getFile(monitorDataDir);
  let exists = false;
  let isChanged =  false;
  monitors.forEach((monitor,i) => {
    if(monitor.epic == m.epic){
      console.log('epics match, epic: ' + m.epic + ' monitor epic: ' + monitor.epic);
      exists = true;
      if(monitor.dealId !== m.dealId){
        console.log('Monitor has found epic ' + m.epic + ', but with a different dealId, replacing with:');
        //console.log(m);
        monitors.splice(i,1);
        exists = false;
        isChanged = true;
      }
      if(monitor.subscribed !== m.subscribed){
        console.log('monitor subscribed status is different');
        console.log(m.subscribed);
        monitor.subscribed = m.subscribed;
        isChanged = true;
      }
    }
  });
  console.log(exists);
  if(exists == false){
    console.log('Monitor does not exist, adding. Exists is: ' + exists + ', epic is: ' + m.epic);
    monitors.push(m);
    isChanged = true;
  } else {
    console.log('Monitor for epic: ' + m.epic + ' already exists');
  }

  if(isChanged == true){
    console.log('monitor has changed, updating...');
    await cloud.updateFile(monitors,monitorDataDir);
  }

  //write monitor data to tmp_file stored on server
  const tmpMonitorPath = 'core/data/tmpMonitor.json';
  fs.writeFile(tmpMonitorPath, JSON.stringify(monitors), { flag: 'w' }, function (err) {
    if (err) throw err;
    console.log("tmp monitor should be saved");
  });
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
        console.log(r);
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
    if(monitor.epic == epic){
      console.log('found monitor with epic: ' + epic + ', removing from log.');
      monitors.splice(i,1);
    }
  });
  cloud.updateFile(monitors,monitorDataDir);
  const tmpMonitorPath = 'core/data/tmpMonitor.json';
  fs.writeFile(tmpMonitorPath, JSON.stringify(monitors), { flag: 'w' }, function (err) {
    if (err) throw err;
    console.log("tmp monitor should be saved");
  });
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
