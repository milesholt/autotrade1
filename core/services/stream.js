//Requirements
var actions = {};
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');

var data = [];
//var streamLogDir = path.join(__dirname, 'stream.json');
//const epic = 'CS.D.BITCOIN.TODAY.IP';
var subscriptionMode = 'MERGE';
// var items = ['L1:'+epic];
// var fields = ['UPDATE_TIME', 'BID', 'OFFER', 'HIGH', 'LOW', 'MID_OPEN'];
var items = ['CHART:'+epic+':HOUR'];
var fields = ['UTM','LTV', 'OFR_OPEN','OFR_CLOSE','OFR_HIGH','OFR_LOW','BID_OPEN','BID_CLOSE','BID_HIGH','BID_LOW'];

//todo: setup monitoring when deal is made to monitor status as it's being processed
//sometimes a deal will be created but the confirm will be dealnotfound and it wont be processed, we need to subscribe to stream to see whats happening
//var streamLogDir = path.join(__dirname, 'stream_DealCreateMonitor.json');
//var items = ['TRADE:'+process.env.IG_IDENTIFIER];
//var fields = ['CONFIRMS','OPU'];


var destroyStream = false;
var connection = 'NONE';

actions.connection = connection;

actions.connectStream = function(check){
    console.log('CONNECTING TO STREAM');
    connection = 'CONNECTING';
    api.connectToLightstreamer();
  // return new Promise((resolve, reject) => {
  //   if(!check) api.connectToLightstreamer();
  //   if(api.isConnectedToLightStreamer()) {
  //     resolve();
  //   }else{
  //     reject();
  //   }
  // });
}

actions.isConnected = async function(){
  //return api.isConnectedToLightStreamer();
  return new Promise((resolve, reject) => {
    if(api.isConnectedToLightStreamer()) {
      resolve();
    }else{
      reject();
    }
  });
}

actions.startStream = async function(epic, streamLogDir = false){

  if(!streamLogDir){
    console.log('stream path not set');
    return false;
  }

  // if(!actions.isConnected()){
  //   //streamer not connected, connect then retry
  //   console.log('Not connected, reconnecting');
  //   actions.connectStream();
  //   setTimeout(()=>{
  //     console.log('stream not connected, connecting and trying again in 2 secs..');
  //     actions.startStream(epic,streamLogDir);
  //   }, 2000);
  // } else {
  //   if(api.isConnectedToLightStreamer()) {
  //     console.log('Stream is connected.');
  //     let items = ['CHART:'+epic+':HOUR'];
  //     await api.subscribeToLightstreamer(subscriptionMode, items, fields, 0.5, streamLogDir, epic);
  //     if(api.lsIsError == true){
  //       console.log('Stream error. Stopping.');
  //       return false;
  //     }
  //   } else {
  //     console.log('Stream still not connnected, trying again in 2 seconds...');
  //     setTimeout(()=>{
  //       console.log('stream not connected, connecting and trying again in 2 secs..');
  //       actions.startStream(epic,streamLogDir);
  //     }, 2000);
  //   }

  switch(connection){
    case 'NONE':
      actions.connectStream();
    break;

    case 'CONNECTING':
      actions.checkConnection();
      setTimeout(() => {
            console.log('stream is still connecting, trying again in 2 secs..');
            actions.startStream(epic,streamLogDir, positionData, true);
      }, 2000);
    break;

    case 'CONNECTED':
      console.log('connected!');
    break;
  }

  // let items = ['CHART:'+epic+':HOUR'];
  // await actions.connectStream(check).then( async r =>{
  //   if(api.isConnectedToLightStreamer()) {
  //     console.log('streamer should be connected.');
  //     await api.subscribeToLightstreamer(subscriptionMode, items, fields, 0.5, streamLogDir, epic);
  //     if(api.lsIsError == true){
  //       console.log('Stream error. Stopping.');
  //       return false;
  //     }
  //   }
  // }).catch(e => {
  //   setTimeout(() => {
  //       console.log('stream not connected, trying again in 2 secs..');
  //       actions.startStream(epic,streamLogDir, positionData, true);
  //   }, 2000);
  // });
}


actions.checkConnection = function(){
  actions.isConnected().then(r => {
    connection = 'CONNECTED';
    console.log('------------------STREAM IS CONNECTED');
  }).catch(e => {
    console.log('still not connected');
  });
}

actions.unsubscribe = function(epic){
  console.log(epic);
  api.unsubscribeToLightstreamer(epic);
  destroyStream = true;
}

actions.disconnectStream = function(){
  api.disconnectToLightstreamer();
  connection = 'NONE';
}

actions.getActiveSubscriptions = async function(){
  return api.getActiveSubscriptions();
}

actions.isSubscribed = async function(epic){
  return api.isSubscribed(epic);
}

actions.isActive = async function(epic){
  return api.isActive(epic);
}

actions.readStream = function(streamLogDir,single){
  return new Promise((resolve, reject) => {
    setTimeout(()=>{

        // Create a readable stream
        var readerStream = fs.createReadStream(streamLogDir);

        // Set the encoding to be utf8.
        readerStream.setEncoding('UTF8');

        // Handle stream events --> data, end, and error
        readerStream.on('data', function(chunk) {

           //data += chunk;

           if (/^[\],:{}\s]*$/.test(chunk.replace(/\\["\\\/bfnrtu]/g, '@').
            replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
            replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
              //the json is ok
              data = JSON.parse(chunk);
            }else{
              //the json is not ok
              data = {};
            }

        });

        readerStream.on('end',function() {
          if(destroyStream){
            console.log('destroyStream is true, stream should be destroyed.');
            readerStream.destroy();
            //reset
            destroyStream = false;
            //reject('readerStream rejected');
          } else{
            //console.log(data);
            let d = {};
            if(Array.isArray(data)){
              //console.log(data);
              let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
              d = {
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
            }
            resolve(d);
          }
        });

        readerStream.on('error', function(err) {
          console.log('Error from stream:');
           reject(err.stack);
        });

        if(!single){
          if(!destroyStream){
            actions.readStream(streamLogDir,single);
          }
        }

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
