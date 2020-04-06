//Requirements
var actions = {};
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');

var data = [];
var streamLogDir = path.join(__dirname, 'stream.json');
const epic = 'CS.D.BITCOIN.TODAY.IP';
var subscriptionMode = 'MERGE';
// var items = ['L1:'+epic];
// var fields = ['UPDATE_TIME', 'BID', 'OFFER', 'HIGH', 'LOW', 'MID_OPEN'];
var items = ['CHART:'+epic+':HOUR'];
var fields = ['UTM','LTV', 'OFR_OPEN','OFR_CLOSE','OFR_HIGH','OFR_LOW','BID_OPEN','BID_CLOSE','BID_HIGH','BID_LOW'];


actions.connectStream = function(check){
  return new Promise((resolve, reject) => {
    if(!check) api.connectToLightstreamer();
    if(api.isConnectedToLightStreamer()) {
      resolve();
    }else{
      reject();
    }
  });
}

actions.startStream = async function(check = false){
  await actions.connectStream(check).then(r =>{
    if(api.isConnectedToLightStreamer()) {
      console.log('streamer should be connected.');
      api.subscribeToLightstreamer(subscriptionMode, items, fields, 0.5, streamLogDir);
    }
  }).catch(e => {
    setTimeout(() => {
        console.log('stream not connected, trying again in 2 secs..');
        actions.startStream(true);
    }, 2000);
  });
}

actions.endStream = function(){
  api.unsubscribeToLightstreamer();
  api.disconnectToLightstreamer();
}

actions.readStream = function(single){
  return new Promise((resolve, reject) => {
    setTimeout(()=>{

        // Create a readable stream
        var readerStream = fs.createReadStream(streamLogDir);

        // Set the encoding to be utf8.
        readerStream.setEncoding('UTF8');

        // Handle stream events --> data, end, and error
        readerStream.on('data', function(chunk) {
           //data += chunk;
           data = JSON.parse(chunk);
        });

        readerStream.on('end',function() {
            console.log(data);
            let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
            let d = {
              'snapshotTime':time,
              'openPrice': {
                'bid': parseFloat(data[8]),
                'ask': parseFloat(data[4]),
                'lastTraded': null
              },
              'closePrice': {
                'bid': parseFloat(data[9]),
                'ask': parseFloat(data[5]),
                'lastTraded': null
              },
              'highPrice': {
                'bid': parseFloat(data[10]),
                'ask': parseFloat(data[6]),
                'lastTraded': null
              },
              'lowPrice': {
                'bid': parseFloat(data[11]),
                'ask': parseFloat(data[7]),
                'lastTraded': null
              },
              'lastTradedVolume': parseFloat(data[3])
            }
           resolve(d);
        });

        readerStream.on('error', function(err) {
           reject(err.stack);
        });

        if(!single) actions.readStream(single);

    },3000);
  });
}

/* Errors */

function error(e){
  console.log(e);
}

module.exports = {
  actions: actions
}
