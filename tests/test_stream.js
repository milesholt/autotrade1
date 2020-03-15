// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

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

  const epic = 'CS.D.BITCOIN.TODAY.IP';
  var subscriptionMode = 'MERGE';
  //var items = ['L1:'+epic];
  //var items = ['MARKET:'+epic];
  //var fields = ['UPDATE_TIME', 'BID', 'OFFER', 'HIGH', 'LOW', 'MID_OPEN'];
  var items = ['CHART:'+epic+':HOUR'];
  var fields = ['UTM','LTV', 'OFR_OPEN','OFR_CLOSE','OFR_HIGH','OFR_LOW','BID_OPEN','BID_CLOSE','BID_HIGH','BID_LOW', 'LTP_OPEN', 'LTP_CLOSE','LTP_HIGH','LTP_LOW'];
  var data = [];
  var streamLogDir = path.join(__dirname, 'stream.json');


  console.log('--------BEGIN EXEC AUTO TRADE');

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Retrieve data from epic
  console.log('-------Starting light streamer');

  //if data from file is empty, load last 3 days
  api.connectToLightstreamer();
  api.subscribeToLightstreamer(subscriptionMode, items, fields, 0.5, streamLogDir);


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
         // let d = {
         //   'run_time': data[0],
         //   'epic': data[1],
         //   'update_time': data[2],
         //   'bid': data[3],
         //   'offer': data[4],
         //   'high': data[5],
         //   'low': data[6],
         //   'mid_open': data[7]
         // }


         console.log(data);

         let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
         let d = {
           'snapshotTime':time,
           'openPrice': {
             'bid': parseFloat(data[8]),
             'ask': parseFloat(data[4]),
             'lastTraded': parseFloat(data[12])
           },
           'closePrice': {
             'bid': parseFloat(data[9]),
             'ask': parseFloat(data[5]),
             'lastTraded': parseFloat(data[13])
           },
           'highPrice': {
             'bid': parseFloat(data[10]),
             'ask': parseFloat(data[6]),
             'lastTraded': parseFloat(data[14])
           },
           'lowPrice': {
             'bid': parseFloat(data[11]),
             'ask': parseFloat(data[7]),
             'lastTraded': parseFloat(data[15])
           },
           'lastTradedVolume': parseFloat(data[3])
         }
         console.log(d);
      });

      readerStream.on('error', function(err) {
         console.log(err.stack);
      });

  },3000);





}
