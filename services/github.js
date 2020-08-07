//Require Github API
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');

var actions = {};
moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });
const obj = {};
const path = '';
const owner = 'milesholt';
const branch = 'main';
let shas = [];
let sha = 0;
const repo = 'autotrade1';

//Ini
actions.iniGitub = async function(path){
  shas = [];
  sha = 0;
}

//Get file
actions.getFile = async function(path){
  console.log('Getting file from github');
  console.log(path);
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: owner,
  repo: repo,
  path: path
}).catch(e => {
  console.log(e);
});
  
  shas.push({'path': path, 'sha':result.data.sha});
  /*shas.forEach(s =>{ 
    if(s.path == path){
      s.sha = result.data.sha;
    }else{
      shas.push({'path': path, 'sha':result.data.sha});
    }
  });*/
  
  sha = result.data.sha;
  console.log('getting file, sha is now:' + sha);
  //decode data from base64 string to object
  let buff = new Buffer.from(result.data.content, 'base64');
  let string = buff.toString('ascii');
  let obj = JSON.parse(string);
  return obj;
}

//Update file
actions.updateFile = async function(data,path){
  const timestamp = Date.now(); 
  //encode data to base64 string
  let dataToStr = typeof data === 'string' ? data : JSON.stringify(data);
  let dataTo64 = Buffer.from(dataToStr).toString("base64");
  //update SHA
  console.log(shas);
  shas.forEach(s =>{ 
    if(s.path == path){
      console.log('Found matching path');
      console.log(s);
      sha = s.sha; 
    } 
  });
  //await actions.getFile(path);
  console.log('updating file with sha: ' + sha + ' and path:' + path);
  //write data 
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
  //console.log(result);
}

module.exports = {
  actions: actions,
  shas: shas,
  sha: sha
}
