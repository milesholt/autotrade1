
//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
// const https = require('https');
const path = require('path');
moment().format();

//Parameters

//Execute main function
exec();

//Begin Exec function
async function exec(){

  const epic1 = 'CS.D.XLMUSD.TODAY.IP';
  const epic2 = 'CS.D.XLMUSD.TODAY.IP';
  var subscriptionMode = 'MERGE';
  //var items = ['L1:'+epic];
  //var items = ['MARKET:'+epic];
  //var fields = ['UPDATE_TIME', 'BID', 'OFFER', 'HIGH', 'LOW', 'MID_OPEN'];
  var item1 = ['CHART:'+epic1+':HOUR'];
  var item2 = ['CHART:'+epic2+':HOUR'];
  var fields = ['UTM','LTV', 'OFR_OPEN','OFR_CLOSE','OFR_HIGH','OFR_LOW','BID_OPEN','BID_CLOSE','BID_HIGH','BID_LOW'];
  var data = [];
  var streamLogDir = path.join(__dirname, 'stream.json');


  console.log('--------BEGIN EXEC AUTO TRADE');

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //start Streamer
  console.log('-------Starting light streamer');
  api.connectToLightstreamer();

  //Create simulation of subscriptions
  try{
    await api.subscribeToLightstreamer(subscriptionMode, item1, fields, 0.5, streamLogDir, epic1);
    await api.subscribeToLightstreamer(subscriptionMode, item2, fields, 0.5, streamLogDir, epic2);
    // setTimeout(async ()=>{
    //   await api.subscribeToLightstreamer(subscriptionMode, item2, fields, 0.5, streamLogDir, epic2);
    // },5000);
  } catch(e) {
    console.log(e);
  }

//Loop through subscriptions and check for multiple subscriptions of one epic
let subscriptions = [];
let epics = [];
setTimeout(async ()=>{
  try{
    //Return active subscriptions
    subscriptions =  await api.getActiveSubscriptions();
    console.log(subscriptions.length);

    //Loop through and check EPIC ID, if ID is already listed as a subscription, unsubscribe one
    subscriptions.forEach(subscription => {
      id = subscription.ik.LS_id;
      epics.forEach(epic=>{
          if(id == epic){
            console.log('subscription already exists, unsubscribing');
            api.unsubscribeToLightstreamer(epic1);
          }
      });

      epics.push(id);
    });
  } catch(e) {
    console.log(e);
  }
},10000);


//Re-check subscriptions
setTimeout(async ()=>{
  try{
    subscriptions =  await api.getActiveSubscriptions();
    console.log(subscriptions.length);
  } catch(e) {
    console.log(e);
  }
},20000);






}
