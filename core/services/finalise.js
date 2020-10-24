
var actions = {};
var core;
var cloud;
//const cloud = require('../handlers/cloudHandler.js');

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  cloud = core.cloudHandler.actions;
}

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
