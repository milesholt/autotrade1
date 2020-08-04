//Require Github API
const GitHub = require('github-api');
const { Octokit } = require("@octokit/core");
const moment=require('moment');

var actions = {};
moment().format();
//Authenticate with Personal Access Token from Github Developer Settings
const octokit = new Octokit({ auth: 'aac51dc7ed32b39e7d7789f461703d81ea0ad724' });
const obj = {};
let sha = 0;
const path = '';
const owner = 'milesholt';
const branch = 'main';
const repo = 'autotrade1';

//Get file
actions.getFile = async function(path){
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: owner,
  repo: repo,
  path: path
}).catch(e => {
  console.log(e);
});
  sha = result.data.sha;
  return JSON.parse(atob(result.data.content));
}

//Update file
actions.updateFile = async function(content,path){
  const timestamp = Date.now();
  const result =  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: owner,
    repo: repo,
    path: path,
    message: 'beforerange updated - ' + moment(timestamp).format('LLL'),
    content: content,
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
