//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');
moment().format();

let openLevel = 0;
let limitLevel = 0;
let stopLevel = 0;
let direction = '';
let dealId = '';

//Require stream
const stream = require('../services/stream.js');
//Require mailer
const mailer = require('../services/mailer.js');
//Stream log
var streamLogDir = path.join(__dirname, '../services/stream.json');
let streamLog = require(streamLogDir);

beginMonitor();

async function beginMonitor(){
  //login

  await api.login(true).then(r => {
    //console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  console.log('logged in, getting open positions..');

  //get open position information

  await api.showOpenPositions().then(async positionsData => {
    //console.log(util.inspect(positionsData, false, null));

    if(positionsData.positions.length){
      const position = positionsData.positions[0].position;

      console.log(position);

      openLevel = position.openLevel;
      limitLevel = position.limitLevel;
      stopLevel = position.stopLevel;
      direction = position.direction;
      dealId = position.dealId;

    } else{
      console.log('no opens positions found');
    }
  });

  //start stream
  //use real-time streaming to get latest hour
  await stream.actions.startStream();
  await stream.actions.readStream(false).then(r => {

    let closeprofit = false;
    let closeloss = false;
    let limitDiff = (Math.abs(openLevel - limitLevel) / 2);
    let newlimitBuy = openLevel + limitDiff;
    let newlimitSell = openLevel - limitDiff;
    let newlimit = direction == 'BUY' ? newlimitBuy : newlimitSell;

    console.log('new limit is: ' + newlimit);

    let monitorAnalysis = {
      limitLevel: limitLevel,
      stopLevel: stopLevel,
      newLimit: newlimit,
      openLevel: openLevel,
      direction: direction
    }

    var mailOptions = {
      from: 'contact@milesholt.co.uk',
      to: 'miles_holt@hotmail.com',
      subject: 'Started monitoring trade - ANALYSIS ' + moment().format('LLL'),
      text: JSON.stringify(monitorAnalysis)
    };
    mailer.actions.sendMail(mailOptions);

    console.log('Stream response:');
    var timer = setInterval(()=>{
      fs.readFile(streamLogDir, function (err, data) {
        if (err) {
          stream.actions.endStream();
          return console.error(err);
        }

        if (/^[\],:{}\s]*$/.test(data.toString().replace(/\\["\\\/bfnrtu]/g, '@').
         replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
         replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
              //the json is ok

              data = JSON.parse(data.toString());
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

              //if stream price goes beyond settings, take action

              //our settings
              //half the limit level
              if(direction == 'BUY' && d.closePrice.ask >= newlimit) closeprofit = true;
              if(direction == 'SELL' && d.closePrice.bid <= newlimit) closeprofit = true;

              //stopLevel remains as is
              if(direction == 'BUY' && d.closePrice.ask <= stopLevel) closeloss = true;
              if(direction == 'SELL' && d.closePrice.bid >= stopLevel) closeloss = true;

              let closePrice = direction == 'BUY' ? d.closePrice.ask : d.closePrice.bid;

              //if(stream.actions.isConnected()){

                if(closeprofit){

                  console.log('New limit level reached. Closing position.');
                  console.log('new limit was: ' + newlimit);
                  console.log('closing price was: ' + closePrice);

                  console.log('PROFIT - Finished monitoring, positions should be closed. Ending stream.');
                  stream.actions.endStream();

                  let closeAnalysis = {
                    limitLevel: limitLevel,
                    stopLevel: stopLevel,
                    newLimit: newlimit,
                    lastClose: closePrice,
                    direction: direction
                  }

                  api.closePosition(dealId).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
                  var mailOptions = {
                    from: 'contact@milesholt.co.uk',
                    to: 'miles_holt@hotmail.com',
                    subject: 'Closed position, new limit reached. PROFIT ' + moment().format('LLL'),
                    text: JSON.stringify(closeAnalysis)
                  };
                  mailer.actions.sendMail(mailOptions);
                  clearInterval(timer);
                }

                if(closeloss){

                  console.log('LOSS - Finished monitoring, positions should be closed. Ending stream.');
                  stream.actions.endStream();

                  let closeAnalysis = {
                    limitLevel: limitLevel,
                    stopLevel: stopLevel,
                    lastClose: closePrice,
                    direction: direction
                  }
                  var mailOptions = {
                    from: 'contact@milesholt.co.uk',
                    to: 'miles_holt@hotmail.com',
                    subject: 'Closed position, hit stop level. LOSS ' + moment().format('LLL'),
                    text: JSON.stringify(closeAnalysis)
                  };
                  mailer.actions.sendMail(mailOptions);
                  clearInterval(timer);
                }

                console.log('close price: ' + closePrice + ' newlimit: ' + newlimit);
              // } else {
              //   console.log('Stream is no longer connected.');
              // }


        } else{
                //the json is not ok
                data = {};
        }
      });
    },3000);

    // let close = false;
    // let limitDiff = (Math.abs(openLevel - limitLevel) / 2);
    // let newlimitBuy = openLevel + limitDiff;
    // let newlimitSell = openLevel - limitDiff;
    // let newlimit = direction == 'BUY' ? newlimitBuy : newlimitSell;
    //
    // console.log('new limit is: ' + newlimit);
    //
    // console.log('Stream response:');
    // setInterval(()=>{
    //   fs.readFile(streamLogDir, function (err, data) {
    //     if (err) {
    //       return console.error(err);
    //     }
    //
    //     data = JSON.parse(data.toString());
    //     let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
    //     let d = {
    //       'snapshotTime':time,
    //       'openPrice': {
    //         'bid': parseFloat(data[8]),
    //         'ask': parseFloat(data[4]),
    //         'lastTraded': null
    //       },
    //       'closePrice': {
    //         'bid': parseFloat(data[9]),
    //         'ask': parseFloat(data[5]),
    //         'lastTraded': null
    //       },
    //       'highPrice': {
    //         'bid': parseFloat(data[10]),
    //         'ask': parseFloat(data[6]),
    //         'lastTraded': null
    //       },
    //       'lowPrice': {
    //         'bid': parseFloat(data[11]),
    //         'ask': parseFloat(data[7]),
    //         'lastTraded': null
    //       },
    //       'lastTradedVolume': parseFloat(data[3])
    //     }
    //
    //     //if stream price goes beyond settings, take action
    //     //the latest price is the close bid, even for a buy. I'm asking IG about this.
    //
    //     //our settings
    //     //half the limit level
    //     if(direction == 'BUY' && d.closePrice.bid >= newlimit) close = true;
    //     if(direction == 'SELL' && d.closePrice.bid <= newlimit) close = true;
    //
    //     if(close){
    //       console.log('New limit level reached. Closing position.');
    //       console.log('new limit was: ' + newlimit);
    //       console.log('closing price was: ' + d.closePrice.bid);
    //
    //       let closeAnalysis = {
    //         limitLevel: limitLevel,
    //         stopLevel: stopLevel,
    //         newLimit: newlimit,
    //         lastClose: d.closePrice.bid,
    //         direction: direction
    //       }
    //
    //       api.closePosition(dealId).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
    //       var mailOptions = {
    //         from: 'contact@milesholt.co.uk',
    //         to: 'miles_holt@hotmail.com',
    //         subject: 'Closed position, new limit reached. ' + moment().format('LLL'),
    //         text: JSON.stringify(closeAnalysis)
    //       };
    //       mailer.actions.sendMail(mailOptions);
    //
    //       console.log('Finished monitoring, positions should be closed. Ending stream.');
    //       stream.actions.endStream();
    //
    //     }
    //
    //     console.log(d);
    //   });
    // },3000);
  });


}
