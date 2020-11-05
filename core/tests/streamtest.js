import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');

moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });
const obj = {
            epic : 'EPIC',
            closeAsk: 1.23,
            closeBid: 1.23,
            newlimit: 1.23,
            stoplevel: 1.23,
            updated: Date.now(); 
          }
let objJsonStr = JSON.stringify(obj);
let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
let sha = 0;
const path = 'core/data/CS.D.XLMUSD.TODAY.IP/CS.D.XLMUSD.TODAY.IP_streamdata.json';

ini();

//Initiate
async function ini(){
  //First read the file and update SHA value
  await getFile();
  //Then update existing file with the new SHA
  updateFile(objJsonB64);
}

//Get file
async function getFile(){
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: 'milesholt',
  repo: 'autotrade1',
  path: path
}).catch(e => {
  console.log(e);
});
  console.log(result);
  sha = result.data.sha;
}

//Update file
async function updateFile(content){
  const timestamp = Date.now();
  const result =  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: 'milesholt',
    repo: 'autotrade1',
    path: path,
    message: 'beforerange updated - ' + moment(timestamp).format('LLL'),
    content: content,
    branch: 'master',
    sha: sha
  }).catch(e => {
    console.log(e);
  });
  console.log(result);
}


