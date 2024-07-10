//import { createRequire } from 'module';
//const require = createRequire(import.meta.url);
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');
const p = require('path');

moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });
// const obj =
//       {
//       "lastBeforeRangeTrendMovement" : "bearish",
//       "lastBeforeRangeTrendMovementClose" : 9245.03,
//       "lastBeforeRangeTrendMovementTime" : "2020-07-14 22:00:00"
//       }

var epic = 'CC.D.W.USS.IP';
var mid = 3;

var d = p.join(__dirname, '../data/'+ epic +'/'+ epic +'_analysisdata.json');
var analysisArr = require(d);

analysisArr.forEach(analysis => {
  delete analysis.pricedata;
});

//console.log(analysisArr);
let obj = analysisArr;
let objJsonStr = JSON.stringify(obj);
//
 objJsonStr = 'var analysis_'+mid+'='+JSON.stringify(obj);

let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
let sha = '0';
const path = 'core/data/'+ epic +'/'+ epic +'_analysisdata.js';
const owner = 'milesholt';
const branch = 'version2';
const repo = 'autotrade1';

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
async function updateFile(content){
  const timestamp = Date.now();
  const result =  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: owner,
    repo: repo,
    path: path,
    message: 'File updated - ' + moment(timestamp).format('LLL'),
    content: content,
    branch: branch,
    sha: sha
  }).catch(e => {
    console.log(e);
  });
  console.log(result);
}

//Delete file
async function deleteFile(){
  const result =  await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
    owner: 'milesholt',
    repo: 'autotrade1',
    path: path,
    message: 'file deleted',
    branch: 'master',
    sha: sha
  }).catch(e => {
    console.log(e);
  });
  console.log(result);
}
