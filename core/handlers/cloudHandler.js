
//Call specific service to handle cloud based actions
const github = require('../services/github.js');

var actions = {};
var core;


/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
}

/*

GET FILE
This gets a file hosted on cloud server

*/

actions.getFile = async function(dir){
  return await github.actions.getFile(dir);
}


/*

UPDATE FILE
This updates a file hosted on cloud server

*/

actions.updateFile = async function(data,dir){
  await github.actions.updateFile(data,dir);
}


/*

GET FILES
This gets required data files from the cloud server
*/

actions.getFiles = async function(){
  github.shas = [];
  prices = await github.actions.getFile(pricedataDir);
  pricesSha = github.sha;
  beforeRangeData = await github.actions.getFile(beforeRangeDir);
  beforeRangeSha = github.sha;
  bRD = beforeRangeData;
  trades = await github.actions.getFile(tradeDataDir);
  tradeDataSha = github.sha;
  accounts = await github.actions.getFile(accountDataDir);
  accountDataSha =  github.sha;
  monitors = await github.actions.getFile(monitorDataDir);
  monitorDataSha = github.sha;
  //merge cloud markets with config markets to merge any new additional markets
  // let cld_markets = await github.actions.getFile(marketDataDir);
  // markets = markets.map((item, i) => Object.assign({}, item, cld_markets[i]));
  markets = await github.actions.getFile(marketDataDir);
}

/*

GET MAIN FILES
This gets the main files that arent specific to an epic or market
*/

actions.getMainFiles = async function(){
  accounts = await github.actions.getFile(accountDataDir);
  accountDataSha =  github.sha;
  monitors = await github.actions.getFile(monitorDataDir);
  monitorDataSha = github.sha;
  markets = await github.actions.getFile(marketDataDir);
}

module.exports = {
  actions: actions
}
