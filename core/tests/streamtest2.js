
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');

moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });
let sha = 0;
const owner = 'milesholt';
const repo = 'autotrade1';
const branch = 'version2';
const path = 'core/data/CS.D.XLMUSD.TODAY.IP/CS.D.XLMUSD.TODAY.IP_streamdata.json';
var window = window || {};

const github = require('../services/github.js');

go();

//Delay operations
async function wait(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Initiate
async function go(){

    //Set new data
    let time = Date.now();
    let modtime = moment().format('LT');
    const data = {
                 epic : 'EPIC',
                 closeAsk: 1.23,
                 closeBid: 1.23,
                 newlimit: 1.23,
                 stoplevel: 1.23,
                 timestamp: time,
                 updated: modtime
               }

     //Update file every 10 seconds
     await github.actions.updateFile(data,path);

     //wait 10 seconds then go again
      await wait(10000).then(async r => {
         //Then go again
         await go();
      }).catch(e =>{
        console.log(e);
      })

}
