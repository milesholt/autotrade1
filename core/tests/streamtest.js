
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

var Base64 = new function() {
  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
  this.encode = function(input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = Base64._utf8_encode(input);
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
  }

  this.decode = function(input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < input.length) {
      enc1 = keyStr.indexOf(input.charAt(i++));
      enc2 = keyStr.indexOf(input.charAt(i++));
      enc3 = keyStr.indexOf(input.charAt(i++));
      enc4 = keyStr.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }
    }
    output = Base64._utf8_decode(output);
    return output;
  }

  this._utf8_encode = function(string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  this._utf8_decode = function(utftext) {
    var string = "";
    var i = 0;
    var c = 0,
      c1 = 0,
      c2 = 0,
      c3 = 0;
    while (i < utftext.length) {
      c = utftext.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if ((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i + 1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        c2 = utftext.charCodeAt(i + 1);
        c3 = utftext.charCodeAt(i + 2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return string;
  }
}()

var btoa = Base64.encode;
var atob = Base64.decode;



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
   
    //let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
    //let objJsonB64 = await buff(objJsonStr);

    //let str2AB = await _stringToArrayBuffer(objJsonStr);
    //let objJsonB64 = await _arrayBufferToBase64(str2AB);


    console.log(obj);

    console.log('string...');
  
    let objJsonStr = JSON.stringify(obj);
  
    console.log(objJsonStr);

    console.log('encoded...');
  
    let enc = btoa(objJsonStr);

    console.log(enc);

    console.log('decoded...');

    let dec = atob(enc);

    console.log(dec);


    //First read the file and update SHA value
//     await getFile();

//     //Update file every 10 seconds
//     await updateFile(enc);

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
 var binary_string = atob(base64);
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
    var base64 = btoa(binary);
    return base64;
}

async function buff(str){
  return await Buffer.from(str).toString("base64");
}

var dDec = {"epic":"EPIC","closeAsk":1.23,"closeBid":1.23,"newlimit":1.23,"stoplevel":1.23,"timestamp":1604657773942,"updated":"10:16 AM"};
var dEnc = 'eyJlcGljIjoiRVBJQyIsImNsb3NlQXNrIjoxLjIzLCJjbG9zZUJpZCI6MS4yMywibmV3bGltaXQiOjEuMjMsInN0b3BsZXZlbCI6MS4yMywidGltZXN0YW1wIjoxNjA0NjU3NzczOTQyLCJ1cGRhdGVkIjoiMTA6MTYgQU0ifQ==';
var d2Dec = {"epic":"EPIC","closeAsk":1.23,"closeBid":1.23,"newlimit":1.23,"stoplevel":1.23,"timestamp":1604657763930,"updated":"10:16 AM"};
var d2Enc = 'eyJlcGljIjoiRVBJQyIsImNsb3NlQXNrIjoxLjIzLCJjbG9zZUJpZCI6MS4yMywibmV3bGltaXQiOjEuMjMsInN0b3BsZXZlbCI6MS4yMywidGltZXN0YW1wIjoxNjA0NjU3NzYzOTMwLCJ1cGRhdGVkIjoiMTA6MTYgQU0ifQ==';

console.log(dDec);
console.log('1 decoded....);
console.log( atob(dEnc));

console.log(d2Dec);
console.log('2 decoded....);
console.log( atob(d2Enc));
