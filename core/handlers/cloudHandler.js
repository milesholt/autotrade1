
//Call specific service to handle cloud based actions
const github = require('../services/github.js');

var actions = {};
var core = require.main.exports;


/*

UPDATE FILE
This updates a file hosted on cloud server

*/

actions.updateFile(data,dir){
  github.actions.updateFile(data,dir);
}


/*

GET FILES
This gets the data files from the cloud server
*/

actions.getFiles(){
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
