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

const github = require('./github.js');
const lib = require('./library.js');

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

  switch(connection){
    case 'NONE':
      actions.connectStream();
    break;

    case 'CONNECTING':
      actions.connection = connection;
      actions.checkConnection();
      setTimeout(() => {
            //console.log('Stream is still connecting, trying again in 2 secs..');
            actions.startStream(epic,streamLogDir);
      }, 2000);
    break;

    case 'CONNECTED':
      actions.connection = connection;
      console.log('Stream is connected. Creating subscription.');
      let items = ['CHART:'+epic+':HOUR'];
      let subscribed = await actions.isSubscribed(epic);
      if(subscribed == false){
        await api.subscribeToLightstreamer(subscriptionMode, items, fields, 0.5, streamLogDir, epic);
           if(api.lsIsError == true){
             console.log('Stream error. Stopping.');
             return false;
           }
      }else {
          console.log('Epic: '+epic+' already subscribed');
      }

      await actions.checkSubscriptions();


    break;
  }

}


actions.checkConnection = async function(){
  var res = false;
  await actions.isConnected().then(async r => {
    connection = 'CONNECTED';
    console.log('------------------STREAM IS CONNECTED');
    res = true;
    return res;
  }).catch(e => {
    //console.log('still not connected');
    //actions.connectStream();
    res = false;
    return res;
  });
  console.log(res);
  return res;
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

actions.checkSubscriptions = async function(){
//  let stream = await github.actions.getFile({}, streamDataDir);
  //if(!lib.actions.isDefined(streams,epic)) streams[epic] = {};

  let ch_subscriptions = [];
  let ch_epics = [];

  //wait a minute in case still making connection
  //setTimeout(()=>{
  //try{
  console.log('Checking connection......');
      if(await actions.checkConnection() === true){

        console.log('Connected, checking active subscriptions');

        setTimeout(async ()=>{
          try{
            //Return active subscriptions
            ch_subscriptions =  await api.getActiveSubscriptions();

            //Loop through all active subscriptions and check EPIC ID, if there is more than one ID, then remove.
            //Each subscription we log the IP into epics array, and if it occurs again, we remove that one
            ch_subscriptions.forEach(subscription => {
              id = subscription.ik.LS_id;
              let add = true;
              ch_epics.forEach(ep=>{
                  if(id == ep){
                    console.log('subscription already exists, unsubscribing');
                    api.unsubscribeToLightstreamer(ep);
                    add = false;
                  }
              });

              if(add) ch_epics.push(id);

            });
          } catch(e) {
            console.log(e);
          }
        },40000);

        //
        //
        //Re-check subscriptions
        setTimeout(async ()=>{
          try{
            ch_subscriptions =  await api.getActiveSubscriptions();
            //Update stream master file
            console.log('No of subscriptions: ' + ch_subscriptions.length);
            streams.noSubscriptions = ch_subscriptions.length;
            streams.epics = ch_epics;
            await github.actions.updateFile(streams, streamDataDir);

          } catch(e) {
            console.log(e);
          }
        },60000);

      } else {
        console.log('No active subscriptions. Lightstreamer is not connected.')
      }

    //},10000);

  // } catch(e) {
  //   console.log('here');
  // }
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
              let time = moment.utc(data[0]).local().format('YYYY-MM-DD HH:mm:ss');
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
  actions: actions,
  connection: connection
}
