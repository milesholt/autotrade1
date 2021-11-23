//Require Github API
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');

var actions = {};
const lib = require('./library.js');

moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: process.env.GIT_PERSONAL_ACCESS_TOKEN });
const obj = {};
//const path = '';
const owner = 'milesholt';
const branch = 'version2';
let shas = [];
let sha = 0;
let isRunning = false;
const repo = 'autotrade1';

//Ini
actions.iniGitub = async function(path){
  shas = [];
  sha = 0;
}

//Is Github operations running - prevent 409 conflict when there are multiple operations at once
actions.wait = async function(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Get file
actions.getFile = async function(path){
  isRunning = true;
  //console.log('Getting file from github: ' + path);


  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: owner,
  repo: repo,
  path: path,
  ref: branch
}).catch(e => {
  if(!JSON.stringify(e).includes('HttpError')){
    console.log(e);
  } else {
    console.log('error getting file: ' +path+ '  from GitHub - HttpError');
    //console.log(e);
  }
});

  //shas.push({'path': path, 'sha':result.data.sha});
  /*shas.forEach(s =>{
    if(s.path == path){
      s.sha = result.data.sha;
    }else{
      shas.push({'path': path, 'sha':result.data.sha});
    }
  });*/

  sha = result.data.sha;
  //console.log('got file: ' + path + ', sha is now:' + sha);

  //decode data from base64 string to object
  let buff = new Buffer.from(result.data.content, 'base64');
  let string = buff.toString('ascii');
  let obj = lib.actions.isJSON(string) ? JSON.parse(string) : string;
  isRunning = false;
  //console.log(obj);
  return obj;
}

//Update file
actions.updateFile = async function(data,path,retry=false){
  const timestamp = Date.now();
  //encode data to base64 string
  let dataToStr = typeof data === 'string' ? data : JSON.stringify(data);
  let dataTo64 = Buffer.from(dataToStr).toString("base64");

  //console.log(dataToStr);

  //update SHA
  //console.log(shas);
  /*
  shas.forEach(s =>{
    if(s.path == path){
      console.log('Found matching path');
      console.log(s);
      sha = s.sha;
    }
  });
  */

  //Github is already running
  if(isRunning){
        //console.log('Cannot update file. Github service is in operation. Waiting 10 seconds..');
        //Wait 10 seconds
        await actions.wait(10000)
          .then(async r => {
           //Then go again
           await actions.updateFile(data,path);
        })
          .catch(e => {
            console.log(e);
            console.log('error waiting for Github operations');
        });
  } else {

        //If nothing is running, begin operation and get file with sha before updating it
        await actions.getFile(path);
        isRunning = true;
        //console.log('updating file with sha: ' + sha + ' and path:' + path);

        //Write data
        const result =  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
          owner: owner,
          repo: repo,
          path: path,
          message: 'File updated - ' + moment(timestamp).format('LLL'),
          content: dataTo64,
          branch: branch,
          sha: sha
        }).catch(async e => {
          if(!JSON.stringify(e).includes('HttpError')){
            console.log(e);
          } else {
            console.log('error updating file: ' +path+ '  from GitHub - HttpError, trying again in 10 seconds...');
            if(retry){
              console.log('Retry failed, giving up.');
            } else{
               await actions.wait(10000)
                .then(async r => {
                //Then go again
                 await actions.updateFile(data,path,true);
               });
            }
          }
        });

        //End operation
        isRunning = false;
  }
}


module.exports = {
  actions: actions,
  shas: shas,
  sha: sha
}
