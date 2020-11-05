
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');

moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });
let time = Date.now();
const obj = {
            epic : 'EPIC',
            closeAsk: 1.23,
            closeBid: 1.23,
            newlimit: 1.23,
            stoplevel: 1.23,
            updated: time
          }
let objJsonStr = JSON.stringify(obj);
let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
let sha = 0;
const owner = 'milesholt';
const repo = 'autotrade1';
const branch = 'version2';
const path = 'core/data/CS.D.XLMUSD.TODAY.IP/CS.D.XLMUSD.TODAY.IP_streamdata.json';

ini();

//Initiate
async function ini(){
  //First read the file and update SHA value
  await getFile();
            
  setInterval(() => {
            //Update file every three seconds
            updateFile(objJsonB64);
  },3000);

}

//Get file
async function getFile(){
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: owner,
  repo: repo,
  path: path,
  ref: branch
}).catch(e => {
  console.log(e);
});
  console.log(result);
  sha = result.data.sha;
}

//Update file
async function updateFile(data){
  let dataToStr = typeof data === 'string' ? data : JSON.stringify(data);
  let dataTo64 = Buffer.from(dataToStr).toString("base64");
  const timestamp = Date.now();
  const result =  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: path,
            message: 'File updated - ' + moment(timestamp).format('LLL'),
            content: dataTo64,
            branch: branch,
            sha: sha
  }).catch(e => {
    console.log(e);
  });
}


