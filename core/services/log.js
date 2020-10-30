
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

START LOG

Log the start of a trade

*/

actions.startLog = async function(epic, analysis, dealId){

  markets.forEach((market,i) => {
    if(market.epic == epic){
      let t = lib.deepCopy(trade);
      t.startAnalysis = analysis;
      t.start_timestamp = Date.now();
      t.start_date = moment().format('LLL');
      t.dealId = dealId;
      market.trades.push(t);
    }
  });

}


/*

CLOSE LOG

Log the end of a trade

*/

actions.closeLog = async function(epic, closeAnalysis){

  markets.forEach((market,i) => {
    if(market.epic == epic){
      let t = market.trades[market.trades.length-1];
      t.closeAnalysis = closeAnalysis;
      t.end_timestamp = Date.now();
      t.end_date = moment().format('LLL');
    }
  });


  //update marketdata file
  cloud.updateFile(markets,marketDataDir);

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

ERROR LOG

Log hourly analysis for market

*/

actions.errorLog = async function(error){
  markets.forEach((market,i) => {
    if(market.epic == epic){
      market.errors.push(error);
    }
  });

}

module.exports = {
  actions:actions
}
