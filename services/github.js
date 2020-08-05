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
const repo = 'autotrade1';

//Get file
actions.getFile = async function(path,sha){
  console.log('Getting file from github');
  console.log(path);
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: owner,
  repo: repo,
  path: path
}).catch(e => {
  console.log(e);
});
  sha = result.data.sha;
  //decode data from base64 string to object
  let buff = new Buffer.from(result.data.content, 'base64');
  let string = buff.toString('ascii');
  let obj = JSON.parse(string);
  return obj;
}

//Update file
actions.updateFile = async function(data,path,sha){
  const timestamp = Date.now(); 
  //encode data to base64 string
  let dataToStr = typeof data === 'string' ? data : JSON.stringify(data);
  let dataTo64 = Buffer.from(dataToStr).toString("base64");
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
  console.log(result);
}

module.exports = {
  actions: actions
}
