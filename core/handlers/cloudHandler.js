
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

  //markets = await github.actions.getFile(marketDataDir);
  //markets = await actions.syncFile(marketDataDir, markets, 'epic');
  let cld_markets = await github.actions.getFile(marketDataDir);
  markets = markets.map((item, i) => Object.assign({}, item, cld_markets[i]));
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
  let cld_markets = await github.actions.getFile(marketDataDir);
  markets = markets.map((item, i) => Object.assign({}, item, cld_markets[i]));
  console.log('markets before sync: ' + markets.length);
  let testmarkets = await actions.syncFile(marketDataDir, markets, 'epic');
  console.log('GETTING MAIN FILES, SYNCED MARKETS');
  console.log(markets.length);
  testmarkets.forEach(market => {
    console.log(market.epic);
  });
}


/* SYNC CLOUD DATA FILE */

actions.syncFile = async function(cloudDataDir, local, checkproperty){
  let cloudFile = await github.actions.getFile(cloudDataDir);
  let localFile = local.map((item, i) => Object.assign({}, item, cloudFile[i]));
  let remove = [];
  // localFile.forEach((field,i) => {
  //   console.log('local epic: ' + field[checkproperty]);
  //   //cloudFile.forEach(cfield=>{
  //     console.log('cloud epic: ' + cfield[checkproperty]);
  //     if(field[checkproperty] !== cloudFile[i][checkproperty]){
  //       console.log(field[checkproperty] + 'does not exist, removing...');
  //       remove.push(i);
  //     }
  //   //});
  // });

  let l = localFile.map(item => item.epic);
  let c = cloudFile.map(item => item.epic);

  console.log(l);
  console.log(c);

  // var array1 = ['a','b','c'],
  //     array2 = ['a','b'],
      remove = l.filter((i => a => a !== c[i] || !++i)(0));

  console.log(remove);
  // remove.forEach(idx=>{
  //     localFile.splice(idx,1);
  // });

  while(remove.length) {
      localFile.splice(remove.pop(), 1);
  }
  return localFile;
}


module.exports = {
  actions: actions
}
