
var actions = {};
var core = core = require.main.exports;
var cloud =  core.cloudHandler.actions;
//const cloud = require('../handlers/cloudHandler.js');

actions.log = async function(epic, closeAnalysis){

  markets.forEach((market,i) => {
    if(market.epic == epic){
      market.trades.push(closeAnalysis);
    }
  });

  //update marketdata file
  cloud.updateFile(markets,marketDataDir);
}

module.exports = {
  actions:actions
}
