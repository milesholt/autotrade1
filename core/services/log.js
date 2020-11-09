
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



  markets.forEach((market,i) => {
    if(market.epic == epic){
      let t = trades[market.tradeId];
      t.closeAnalysis = closeAnalysis;
      t.end_timestamp = Date.now();
      t.end_date = moment().format('LLL');
      market.deal = {};
    }
  });

  let ca = closeAnalysis;

  let amount = (ca.openLevel - ca.lastClose) * size;
  let result = Math.sign(amount) === 1 ? 'PROFIT' : 'LOSS';

  closeAnalysis.amount =  amount;
  closeAnalysis.result =  result;

  accounts.push(closeAnalysis);


  //update marketdata file
  cloud.updateFile(trades,tradeDataDir);

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
