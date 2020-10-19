
//Call specific service to handle cloud based actions
const github = require('../services/github.js');

var actions = {};
var core = require.main.exports;
var github = core.github;


/*

UPDATE FILE
This updates a file hosted on cloud server

*/

actions.updateFile = async function(data,dir){
  await github.actions.updateFile(data,dir);
}


/*

GET FILES
This gets the data files from the cloud server
*/

actions.getFiles = async function(){
  github.shas = [];
  prices = await github.actions.getFile(pricedataDir);
  pricesSha = github.sha;
  beforeRangeData = await github.actions.getFile(beforeRangeDir);
  beforeRangeSha = github.sha;
  let bRD = beforeRangeData;
}

module.exports = {
  actions: actions
}
