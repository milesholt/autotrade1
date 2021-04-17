
//Call specific service to handle cloud based actions
const github = require('../services/github.js');

var actions = {};
var core;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  lib = core.lib.actions;
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
  // let cld_markets = await github.actions.getFile(marketDataDir);
  // markets = markets.map((item, i) => Object.assign({}, item, cld_markets[i]));
  markets = await actions.syncFile(marketDataDir, markets, 'epic');
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
  //let cld_markets = await github.actions.getFile(marketDataDir);
  //markets = markets.map((item, i) => Object.assign({}, item, cld_markets[i]));
  markets = await actions.syncFile(marketDataDir, markets, 'epic');
}


/* SYNC CLOUD DATA FILE */

actions.syncFile = async function(cloudDataDir, localFile, mapProperty){

  //setup
  let remove = [];
  let add = [];

  let cloudFile = await github.actions.getFile(cloudDataDir);

  let tmp_local = lib.deepCopy(localFile);
  let tmp_cloud = lib.deepCopy(cloudFile);

//  console.log(tmp_local);

   //get array with just epics
  let l = localFile.map(item => item[mapProperty]);
  let c = cloudFile.map(item => item[mapProperty]);

  var ls = new Set(l);
  //remove = c.filter(x => !ls.has(x));
  remove = c.flatMap((x,i) =>  !ls.has(x) ? i : []);

  var ls = new Set(c);
  //add = l.filter(x => !ls.has(x));
  add = l.flatMap((x,i) =>  !ls.has(x) ? i : []);


   while(remove.length) {
     tmp_cloud.splice(remove.pop(), 1);
   }

   while(add.length){
     let a = add.pop();
   	 tmp_cloud.splice(a, 0, tmp_local[a]);
   }

   //update if any new properties
   tmp_cloud.forEach( (cfield,i) => {
      tmp_local.forEach( lfield => {
        if(cfield[mapProperty] == lfield[mapProperty]) tmp_cloud[i] = Object.assign({}, lfield, cfield);
      });
   });

   //console.log('Cloud updated file:');
  // console.log(tmp_cloud);

  tmp_cloud = tmp_cloud.map((item, i) => Object.assign({}, item, tmp_local[i]));

  tmp_cloud.forEach((tc,i)=>{
    if(tc.deal) tc.deal = cloudFile[i].deal;
    if(tc.data) tc.data = cloudFile[i].data;
  })

  return tmp_cloud;
}


module.exports = {
  actions: actions
}
