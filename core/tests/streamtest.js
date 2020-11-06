
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
    const obj = {
                epic : 'EPIC',
                closeAsk: 1.23,
                closeBid: 1.23,
                newlimit: 1.23,
                stoplevel: 1.23,
                timestamp: time,
                updated: modtime
              }
    let objJsonStr = JSON.stringify(obj);
    //let objJsonB64 = Buffer.from(objJsonStr).toString("base64");

    let str2AB = await _stringToArrayBuffer(objJsonStr);
    let objJsonB64 = await _arrayBufferToBase64(str2AB);

    console.log(obj);
    console.log(objJsonB64);

    //First read the file and update SHA value
    await getFile();

    //Update file every 10 seconds
    await updateFile(objJsonB64);

    //wait 10 seconds then go again
    await wait(10000).then(async r => {
       //Then go again
       await go();
    }).catch(e =>{
      console.log(e);
    })

}

//Get file
async function getFile(){
  const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
  owner: owner,
  repo: repo,
  path: path,
  ref: branch
}).catch(e => {
  console.log(e.status);
});

  console.log(result.data.sha);
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
  }).then(r=>{
    console.log('updated file..');
  }).catch(e => {
    console.log(e.status);
  });
}


async function _base64ToArrayBuffer(base64) {
 var binary_string = window.atob(base64);
 var len = binary_string.length;
 var bytes = new Uint8Array(len);
 for (var i = 0; i < len; i++) {
     bytes[i] = binary_string.charCodeAt(i);
 }
 return bytes.buffer;
}

async function _stringToArrayBuffer(str) {
  var buff = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buff);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buff;
}

async function _arrayBufferToString(buff) {
 return String.fromCharCode.apply(null, new Uint8Array(buff));
}

async function _arrayBufferToBase64(buff) {
    var binary = '';
    var bytes = new Uint8Array(buff);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    var base64 = window.btoa(binary);
    return base64;
}
