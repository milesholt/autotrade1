//Requirements
var actions = {};
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');
moment().format();

let openLevel = 0;
let limitLevel = 0;
let stopLevel = 0;
let dealId = '';

//Require stream
const stream = require('./stream.js');
//Require mailer
const mailer = require('./mailer.js');
const lib = require('./library.js');
const log = require('./log.js');
const check = require('../handlers/strategies/breakOut/checkHandler.js');
const github = require('./github.js');
const testmailer = require('../tests/mailer.js');
//Stream log
//var streamLogDir = path.join(__dirname, './stream.json');
//var streamLogDir = '';


actions.iniMonitor = async function(dealId,dealRef,epic){

  console.log('ini monitor');
  console.log(epic);

  //streamLogDir = path.join(__dirname, '../data/streams/'+epic+'_stream.json');
  streamLogDir = 'core/data/'+epic+'/'+epic+'_streamdata.json';
  let data = '';


  console.log(process.env.HOME);
  console.log(__dirname);

  //if stream file doesn't exist, create it (w flag)
  await fs.writeFile(streamLogDir, data, { flag: 'w' }, function (err) {
    if (err) throw err;
  });
  //begin monitoring
  await actions.beginMonitor(dealId,dealRef,epic,streamLogDir,false);
}

actions.beginMonitor = async function(dealId,dealRef,epic,streamLogDir,attempt = false){
  //login
  // await api.login(true).then(r => {
  //   //console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  console.log('Beginning monitoring, getting open positions..');
  console.log('direction: ' + direction);
  console.log('dealRef: ' + dealRef);
  console.log('dealId: ' + dealId);
  console.log('epic: ' + epic);

  //create global object otherwise variables arent picked up in foreach loops
  var arr = {};
  arr.epic = epic;
  arr.dealId = dealId;
  arr.dealRef = dealRef;
  arr.streamLogDir = streamLogDir;
  arr.direction =  direction;
  arr.subscribed = false;


  isStreamRunning[epic] = false;

  console.log(arr);
  console.log('isStreamRunning:');
  console.log(isStreamRunning);

  //get open position information

  await api.showOpenPositions().then(async (positionsData) => {
    console.log(util.inspect(positionsData, false, null));

    if(Object.keys(positionsData).indexOf('confirms') !== -1){
      let status = positionsData.confirms.dealStatus;
      if(status == 'REJECTED'){
        console.error('deal was rejected');
        return console.error(positionsData.confirms.reason);
      }
    }
    let positionFound = false;

    if(positionsData.positions.length > 0){

      positionsData.positions.forEach(async (trade,i) => {

          console.log('trade result:' + trade.position.dealReference);
          console.log('arr dealRef:' + arr.dealRef);


          if(trade.position.dealReference == arr.dealRef){

                    //retrieve dealId if undefined
                    if(typeof arr.dealId == 'undefined') {
                      arr.dealId = trade.position.dealId;
                      console.log('dealId was undefined, is now: ' + arr.dealId);
                    }

                    positionFound = true;
                    console.log('Position found for dealRef: ' + arr.dealRef);

                    const p = trade.position;

                    let limitDiff = lib.actions.toNumber(Math.abs(p.level - p.limitLevel) * limitClosePerc);
                    let stopDiff = lib.actions.toNumber(Math.abs(p.level - p.stopLevel) * stopClosePerc);

                    let monitorData = {
                      'newlimitBuy': lib.actions.toNumber(p.level + limitDiff),
                      'newlimitSell':  lib.actions.toNumber(p.level - limitDiff),
                      'newStopBuy':lib.actions.toNumber(p.level - stopDiff),
                      'newStopSell':  lib.actions.toNumber(p.level + stopDiff),
                      'limitLevel': p.limitLevel,
                      'stopLevel': p.stopLevel,
                      'level': p.level
                    }
                    monitorData.newLimit = direction == 'BUY' ? monitorData.newlimitBuy : monitorData.newlimitSell;
                    monitorData.newStop = direction == 'BUY' ? monitorData.newStopBuy : monitorData.newStopSell;


                    console.log(arr.epic);
                    epic = arr.epic;
                    dealId = arr.dealId;

                    //log monitor
                    monitorData = {...arr, ...monitorData};
                    await log.actions.startMonitorLog(monitorData);

                    //declare time before reading stream
                    var timer;

                    //check if stream is already running first
                    //isStreamRunning = false;

                    //get modification time of file
                    let stats = fs.statSync(monitorData.streamLogDir);
                    let modtime = moment(stats.mtime).format('LT');
                    let timestamp = Date.now();
                    let timeonly = moment(timestamp).format('LT');
                    let timediff = moment(timestamp).diff(moment(stats.mtime), "minutes");

                    if(timediff <= 5){
                      //isStreamRunning = true;
                      monitorData.subscribed = true;
                    }

                    if(stream.actions.connection == 'CONNECTED'){

                        //await stream.actions.isSubscribed(monitorData.epic).then(subscribed => {
                        monitorData.subscribed = await stream.actions.isSubscribed(monitorData.epic);
                          if(monitorData.subscribed == true){
                            console.log('First check. Stream is already subscribed: ' + monitorData.epic);

                            //get timestamp from cloud stream log
                            let streamLog = await github.actions.getFile(streamLogDir);
                            console.log(streamLog);
                            let streamTime = lib.actions.isDefined(streamLog,'timestamp') ? streamLog.timestamp : Date.now();
                            console.log(streamTime);
                            console.log(Date.now());
                            let streamLogTimeDiff = moment(Date.now()).diff(moment(streamLog.timestamp), "minutes");
                            console.log('streamLogTimeDiff: ' + streamLogTimeDiff);


                            //console.log('close price: ' + closePrice + ' newlimit: ' + newlimit + ' stoplevel: ' + stopLevel + ' updated: ' + modtime);

                            // if(ep == 'CC.D.LGO.USS.IP'){
                               //console.log('epic: ' + ep + ' close ask: ' + d.closePrice.ask + 'close bid: ' + d.closePrice.bid + ' newlimit: ' + newlimit + ' stoplevel: ' + p.stopLevel + ' updated: ' + modtime);
                            // }

                            //if stream date and modification date difference greater than 5 minutes, restart streaming
                            if(streamLogTimeDiff >= 1){
                              console.log('Stream log on the cloud is not updating but there is a subscription. Unsubscribing and resetting stream.');
                              stream.actions.unsubscribe(monitorData.epic);
                              monitorData.subscribed = false;
                              isStreamRunning[monitorData.epic] = false;
                            } else {
                              console.log('Stream path updated less than 1 minutes ago');
                              isStreamRunning[monitorData.epic] = true;
                              monitorData.subscribed = true;
                            }


                          } else {
                            console.log('Stream is not subscribed');
                            isStreamRunning[monitorData.epic] = false;
                            monitorData.subscribed = false;
                          }
                        // }).catch(e => {
                        //   console.log(e);
                        // });

                    }

                    // if(stream.actions.connection == 'CONNECTING'){
                    //   isStreamRunning = true;
                    // }

                    await log.actions.getMonitorLog(monitorData.epic).then(r =>{
                      console.log('Monitor record found')
                    }).catch(e => {
                      console.log('Monitor record not found');
                    });



                    //
                    // await log.actions.getStreamLog(monitorData.epic).then(r => {
                    //
                    // }).catch(e => {
                    //
                    // });

                    console.log('Epic: ' + monitorData.epic);
                    console.log('isStreamRunning: ' + isStreamRunning[monitorData.epic]);
                    console.log('isSubscribed: ' + monitorData.subscribed);


                    if(isStreamRunning[monitorData.epic] == false && monitorData.subscribed == false){

                    //start stream
                    //use real-time streaming to get latest hour

                      console.log('starting stream, epic: ' + monitorData.epic + ', streamLogDir: ' + monitorData.streamLogDir);
                      await stream.actions.startStream(monitorData.epic,monitorData.streamLogDir);


                    console.log('streamLogDir: ' + streamLogDir);
                    await stream.actions.readStream(monitorData.streamLogDir,false).then(async r => {

                      console.log(stream.actions.connection);

                    if(stream.actions.connection == 'CONNECTED'){



                      let closeprofit = false;
                      let closeloss = false;

                      // console.log('position data:');
                      // console.log(p);

                      console.log('response:');
                      console.log(r);


                      console.log(limitDiff);

                      let newlimitBuy = monitorData.newlimitBuy;
                      let newlimitSell = monitorData.newlimitSell;
                      let newStopBuy = monitorData.newStopBuy;
                      let newStopSell = monitorData.newStopSell;
                      let newlimit = monitorData.newLimit;
                      let newStop = monitorData.newStop;


                      console.log('new limit is: ' + newlimit);

                      let monitorAnalysis = {
                        limitLevel: p.limitLevel,
                        stopLevel: p.stopLevel,
                        newLimit: newlimit,
                        newStop: newStop,
                        openLevel: p.level,
                        direction: p.direction
                      }



                      var mailOptions = {
                        from: 'contact@milesholt.co.uk',
                        to: 'miles_holt@hotmail.com',
                        subject: 'Started monitoring trade. ' + monitorData.epic,
                        text: JSON.stringify(monitorAnalysis)
                      };
                      mailer.actions.sendMail(mailOptions);

                      var counter = 0;

                      //Once this epic is here and has started monitoring, reset isStreamRunning to be allowed for use for other epics that need to be monitored
                      //isStreamRunning[monitorData.epic]  = false;

                      timer = setInterval(()=>{




                        counter += 3;

                        //NOTE - This is reading from the streamLog being written in Heroku server, not Github!
                        //So the data written to Github is after this is read, which is in a different structure

                        fs.readFile(monitorData.streamLogDir, async function (err, data) {
                          if (err) {
                            actions.stopMonitor(timer);
                            return console.error(err);
                          }

                          //test getting tmp_monitordata
                          let x = {};
                          try {
                            let tmpMonitorData = fs.readFileSync('core/data/tmpMonitor.json');
                            let tm = lib.actions.isJSON(tmpMonitorData) ? JSON.parse(tmpMonitorData) : 'no tmp monitor data';

                            tm.forEach(mon=>{
                              //match monitordata with current stream
                              if(mon.streamLogDir == monitorData.streamLogDir){
                                x = mon;

                              }
                            });
                          } catch (e) {
                            console.log('Error loading tmp monitor data, trying again, stopping stream');
                            console.log(e);
                            actions.stopMonitor(timer);
                          }


                          // if (/^[\],:{}\s]*$/.test(data.toString().replace(/\\["\\\/bfnrtu]/g, '@').
                          //  replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
                          //  replace(/(?:^|:|,)(?:\s*\[)+/g, '')) && typeof data !== null && typeof data !== undefined && data.length > 0) {

                            if(lib.actions.isJSON(data)){
                                //the json is ok


                                data = JSON.parse(data.toString());

                                // console.log('reading data from this file: ' + streamLogDir);
                                //if(ep == 'CC.D.LGO.USS.IP')   console.log(data);

                                let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
                                //get epic related to stream
                                let ep = data[1];
                                let dir = x.direction;

                                //console.log('epic: ' + ep + 'path: ' + x.streamLogDir + ' dir:' + x.direction);

                                // markets.forEach(market => {
                                //   if(market.epic == ep) dir = market.deal.direction;
                                // });

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

                                //if monitoring a position over the weekend when market is closed, the monitoring will freeze. So we need to stop monitoring when a value is undefined (market has closed).
                                //in this case, either d.closePrice.ask or d.closePrice.bid will be 'NaN' when this happens

                                if (isNaN(d.closePrice.ask) || isNaN(d.closePrice.bid)) {
                                  let day = moment(data[0]).format('ddd');
                                  if( day == 'Sat' || day == 'Sun'){
                                    console.log('Should be the weekend. Day is: ' + day);
                                    console.log('price data is returning NaN, market has potentially closed while monitoring. Stopping monitoring...');
                                    actions.stopMonitor(timer,ep);
                                    return false;
                                  }
                                }

                                //if stream price goes beyond settings, take action

                                //NOTE: If you're selling to open then you are buying to close.
                                //So if your are SELLING you close at the ASK price. If your are BUYING, you close at the BID price.
                                //console.log('EPIC: ' + ep);
                                //console.log('DATA: ');
                                //console.log(p);

                                if(ep == x.epic){


                                  //console.log('Epics match: ' + ep +  ' | ' + x.epic);
                                  //console.log('epic: ' + ep + ' close ask: ' + d.closePrice.ask + 'close bid: ' + d.closePrice.bid + ' newlimit: ' + x.newLimit + ' newStop: ' + x.newStop);

                                //our settings
                                //use new limit level
                                if(dir == 'BUY' && d.closePrice.bid >= x.newLimit) closeprofit = true;
                                if(dir == 'SELL' && d.closePrice.ask <= x.newLimit) closeprofit = true;

                                //suse new stop level
                                if(dir == 'BUY' && d.closePrice.bid <= x.newStop) closeloss = true;
                                if(dir == 'SELL' && d.closePrice.ask >= x.newStop) closeloss = true;

                                let closePrice = dir == 'BUY' ? d.closePrice.bid : d.closePrice.ask;
                                let foundMonitor =  false;
                                let posfound = false;


                                  if(closeprofit){

                                    console.log('close profit');
                                    console.log('direction: ' + dir);

                                    let m = {};

                                    await log.actions.getMonitorLog(ep).then(r =>{
                                      m = {
                                        epic : r.epic,
                                        dealId: r.dealId,
                                        dealRef: r.dealRef,
                                        direction: r.direction,
                                        streamLogDir: r.streamLogDir
                                      }
                                      foundMonitor = true;
                                    }).catch(e => { console.log(e) });

                                    if(foundMonitor == true){
                                      console.log(m);

                                      console.log('New limit level reached. Closing position.');
                                      console.log('new limit was: ' + x.newLimit);
                                      console.log('closing price was: ' + closePrice);
                                      console.log('closing price (ask) was: ' + d.closePrice.ask);
                                      console.log('closing price (bid) was: ' + d.closePrice.bid);

                                      console.log('PROFIT - Finished monitoring, positions should be closed. Ending stream.');

                                      let closeAnalysis = {
                                        timestamp: Date.now(),
                                        date: moment().format('LLL'),
                                        limitLevel: x.limitLevel,
                                        stopLevel: x.stopLevel,
                                        newLimit: x.newLimit,
                                        lastClose: closePrice,
                                        direction: x.direction,
                                        openLevel: x.level,
                                        data: d,
                                        dealId: x.dealId,
                                        profit:null
                                      }

                                      let marketIsClosed = false;

                                      posfound = false;
                                      await api.showOpenPositions().then(positions => {
                                      console.log(util.inspect(r,false,null));

                                        if(positions.length){
                                          positions.forEach(p => {
                                            if(p.position.dealId == m.dealId){
                                              posfound = true;
                                            }
                                          });
                                        }

                                        if(posfound){
                                          console.log('Position found before closing');
                                        }else {
                                          console.log('Tried to close, but no open positions found with dealId:' + m.dealId);
                                          console.log(positions);
                                          return false;
                                        }
                                      }).catch(e => console.log(e));

                                      await api.closePosition(m.dealId).then(async r =>{
                                        console.log(util.inspect(r, false, null));
                                        if(r.confirms.dealStatus == 'REJECTED' && r.confirms.reason == 'MARKET_CLOSED_WITH_EDITS'){
                                          console.log('Market is closed, cannot close position. Stopping.');
                                          marketIsClosed = true;
                                          actions.stopMonitor(timer, m.epic);
                                        }
                                        closeAnalysis.profit = r.confirms.profit;

                                        if(marketIsClosed == false){
                                          var mailOptions = {
                                            from: 'contact@milesholt.co.uk',
                                            to: 'miles_holt@hotmail.com',
                                            subject: 'Closed position. PROFIT. ' + m.epic,
                                            text: JSON.stringify(closeAnalysis)
                                          };
                                          mailer.actions.sendMail(mailOptions);
                                          actions.stopMonitor(timer, m.epic);
                                          log.actions.closeTradeLog(m.epic,closeAnalysis);
                                          github.actions.updateFile({}, m.streamLogDir);

                                        } else {
                                          console.log('Market is closed, not closing or stopping anything, returning false.');
                                        }

                                        return false;

                                        //get confirmation of position with recorded profit price from server
                                        // await api.confirmPosition(dealRef).then(async positionData =>{
                                        //    //should be positionData.profit
                                        //    console.log(util.inspect(positionData, false, null));
                                        //    closeAnalysis.profit = positionData.confirms.profit;
                                        // }).catch(e => console.log(e));


                                      }).catch(e => console.log(e));




                                    } else {

                                      console.log('Couldnt find monitor data, stopping');
                                      actions.stopMonitor(timer, m.epic);
                                      return false;

                                    }


                                  }

                                  if(closeloss){

                                    console.log('close loss');
                                    console.log('direction: ' + dir);

                                    let m = {};

                                    await log.actions.getMonitorLog(ep).then(r =>{
                                      m = {
                                        epic : r.epic,
                                        dealId: r.dealId,
                                        dealRef: r.dealRef,
                                        direction: r.direction,
                                        streamLogDir: r.streamLogDir

                                      }
                                      foundMonitor = true;
                                    }).catch(e => { console.log(e)

                                    });

                                    if(foundMonitor == true){
                                      console.log(m);

                                      console.log('Stop level reached. Closing position.');
                                      console.log('stop level was: ' + x.stopLevel);
                                      console.log('new stop level: ' + x.newStop);
                                      console.log('closing price was: ' + closePrice);
                                      console.log('closing price (ask) was: ' + d.closePrice.ask);
                                      console.log('closing price (bid) was: ' + d.closePrice.bid);
                                      console.log('direction: ' + dir);

                                      console.log('LOSS - Finished monitoring, positions should be closed. Ending stream.');

                                      let closeAnalysis = {
                                        timestamp: Date.now(),
                                        date: moment().format('LLL'),
                                        limitLevel: x.limitLevel,
                                        stopLevel: x.stopLevel,
                                        newStop: x.newStop,
                                        lastClose: closePrice,
                                        direction: x.direction,
                                        openLevel: x.level,
                                        data: d,
                                        dealId: m.dealId,
                                        profit:null
                                      }

                                      let marketIsClosed = false;


                                      posfound = false;
                                      await api.showOpenPositions().then(async positions => {
                                      console.log(util.inspect(r,false,null));


                                        if(positions.length){
                                          positions.forEach(position => {
                                            if(position.position.dealId == m.dealId){
                                              posfound = true;
                                            }
                                          });
                                        }

                                        if(posfound){
                                          console.log('Position found before closing');
                                        }else {
                                          console.log('No open positions found with dealId:' + m.dealId);
                                          console.log(positions);
                                          console.log('Checking if position has been closed..');
                                          //Check for closed position
                                          await check.actions.checkCloseTrade(m.dealId).then(async r => {
                                            console.log('Closed position found on API. Closed position.');
                                          }).catch(e => { console.log('No closed positions found.'); });
                                          return false;
                                        }
                                      }).catch(e => console.log(e));


                                      await api.closePosition(m.dealId).then(async r =>{
                                        console.log(util.inspect(r, false, null));
                                        if(r.confirms.dealStatus == 'REJECTED' && r.confirms.reason == 'MARKET_CLOSED_WITH_EDITS'){
                                          console.log('Market is closed, cannot close position. Stopping.');
                                          actions.stopMonitor(timer, m.epic);
                                          marketIsClosed = true;
                                        }
                                        closeAnalysis.profit = r.confirms.profit;

                                        if(marketIsClosed == false){
                                          var mailOptions = {
                                            from: 'contact@milesholt.co.uk',
                                            to: 'miles_holt@hotmail.com',
                                            subject: 'Closed position. LOSS. ' + m.epic,
                                            text: JSON.stringify(closeAnalysis)
                                          };
                                          mailer.actions.sendMail(mailOptions);
                                          actions.stopMonitor(timer, m.epic);
                                          log.actions.closeTradeLog(m.epic,closeAnalysis);
                                          //update stream data
                                          github.actions.updateFile({}, m.streamLogDir);

                                        } else{
                                          console.log('Market is closed, not closing or stopping anything, returning false.');
                                        }

                                        return false;


                                        //get confirmation of position with recorded profit price from server
                                        // await api.confirmPosition(dealRef).then(async positionData =>{
                                        //    //should be positionData.profit
                                        //    console.log(util.inspect(positionData, false, null));
                                        //    closeAnalysis.profit = positionData.confirms.profit;
                                        // }).catch(e => console.log(e));


                                      }).catch(e => console.log(e));





                                    } else {
                                      console.log('Couldnt find monitor data, doing nothing');
                                      actions.stopMonitor(timer, m.epic);
                                      return false;
                                    }


                                  }

                                  }


                                  stats = fs.statSync(monitorData.streamLogDir);
                                  modtime = moment(stats.mtime).format('LT');
                                  timestamp = Date.now();
                                  timeonly = moment(timestamp).format('LT');
                                  timediff = moment(timestamp).diff(moment(stats.mtime), "minutes");


                                  //console.log('close price: ' + closePrice + ' newlimit: ' + newlimit + ' stoplevel: ' + stopLevel + ' updated: ' + modtime);

                                  // if(ep == 'CC.D.LGO.USS.IP'){
                                     //console.log('epic: ' + ep + ' close ask: ' + d.closePrice.ask + 'close bid: ' + d.closePrice.bid + ' newlimit: ' + newlimit + ' stoplevel: ' + p.stopLevel + ' updated: ' + modtime);
                                  // }

                                  //if stream date and modification date difference greater than 5 minutes, restart streaming
                                  if(timediff >= 5){

                                    //console.log('Time difference greater than 5, timediff: ' + timediff + ' epic: ' + monitorData.epic);

                                    //console.log('Active subscriptions:');
                                    // stream.actions.getActiveSubscriptions().then(r => {
                                    //   console.log(util.inspect(r,false,null));
                                    // }).catch(e => {
                                    //   console.log(e);
                                    // });

                                    //console.log('Is epic ' + monitorData.epic +' subscribed:');
                                    monitorData.subscribed = await stream.actions.isSubscribed(monitorData.epic);
                                    //stream.actions.isSubscribed(monitorData.epic).then(subscribed => {
                                      if(monitorData.subscribed == false){
                                        console.log('Epic '+monitorData.epic+' is not subscribed: ' + monitorData.subscribed);
                                        //check if market is closed
                                        check.actions.checkMarketStatus(monitorData.epic).then(r => {
                                            if(r == 'TRADEABLE'){
                                              stream.actions.startStream(monitorData.epic, monitorData.streamLogDir);
                                            } else {
                                              console.log('Market is closed or offline. Stopping monitor.');
                                              actions.stopMonitor(timer,monitorData.epic);
                                            }
                                        }).catch(e => {
                                            console.log(e);
                                        });

                                      }
                                    // }).catch(e => {
                                    //   console.log(e);
                                    // });

                                    //console.log('Is epic ' + monitorData.epic +' active:');
                                    stream.actions.isActive(monitorData.epic).then(active => {
                                      if(active == false){
                                        console.log('Epic is not active');
                                      }
                                    }).catch(e => {
                                      console.log(e);
                                    });


                                    //modification time isnt same as recorded stream time, possible stream is not being updated, Resetting
                                    // console.log('Resetting stream, possibly not updating. fileupdated:' + timeonly + ' streamupdated: ' + modtime);
                                    // try{
                                    //   await stream.actions.unsubscribe(monitorData.epic);
                                    // } catch(e){
                                    // }
                                    // try{
                                    //   await stream.actions.startStream(monitorData.epic,monitorData.streamLogDir);
                                    // } catch(e){
                                    // }
                                  }


                                  let streamdata = {
                                    epic : ep,
                                    closeAsk: d.closePrice.ask,
                                    closeBid: d.closePrice.bid,
                                    newLimit: newlimit,
                                    newStop: newStop,
                                    stopLevel: x.stopLevel,
                                    direction: x.direction,
                                    openLevel: x.level,
                                    streamUpdated: modtime,
                                    fileUpdated: timeonly,
                                    timediff: timediff,
                                    timestamp: timestamp
                                  }

                                   //update stream data every 60 seconds
                                   //this is to not exceed github api limit
                                  if(counter == 60){
                                    //console.log('resetting counter');
                                    counter = 0;
                                    github.actions.updateFile(streamdata, monitorData.streamLogDir);
                                  }


                          } else{

                                  //the json is not ok, reset
                                  //data = {};

                                  //Stream is connected, but is there a subscription? This would explain why there is no data

                                  monitorData.subscribed = await stream.actions.isSubscribed(monitorData.epic);

                                  //await stream.actions.isSubscribed(monitorData.epic).then(subscribed => {
                                    if(monitorData.subscribed){
                                      //Connection and subscription, but no data being receieved could be a drop or lost update
                                      //Should check status of subscription or use event listener
                                      data = {};

                                      //Ignore if no data is being received, this coud be temporary
                                      //Or check status of subscription


                                      // if(!attempt){
                                      //   setTimeout(()=>{
                                      //     console.log('Trying stream again after 5 seconds');
                                      //     actions.beginMonitor(monitorData.dealId,monitorData.dealRef,monitorData.epic,monitorData.streamLogDir,true);
                                      //   },5000);
                                      // } else{
                                      //     console.log('Tried already, still getting error. Stopping stream');
                                      //     actions.stopMonitor(timer,monitorData.epic);
                                      //     return false;
                                      // }
                                    } else {
                                      //console.log('Connected but stream is not yet subscribed. Could still be subscribing...');
                                      //TO DO: Handle if stream error
                                      //console.log(api.lsIsError);
                                      if(api.lsIsError == true){
                                        console.log('Stream error. Stopping.');
                                        actions.stopMonitor(timer,monitorData.epic);
                                        return false;
                                      } else {
                                        if(!attempt){
                                          setTimeout(()=>{
                                            console.log('No subscription yet. But no light stream error. Trying stream again after 5 seconds. Attempt is:' + attempt);
                                            actions.beginMonitor(monitorData.dealId,monitorData.dealRef,monitorData.epic,monitorData.streamLogDir,true);
                                          },5000);
                                        } else{
                                            console.log('Tried to subscribed a second time but no subscription. Giving up and returning false.');
                                            actions.stopMonitor(timer,monitorData.epic);
                                            return false;
                                        }
                                      }
                                    }
                                  // }).catch(e => {
                                  //   console.log(e);
                                  // });







                          }
                        });
                      },3000);

                    }else{

                      //Handle no stream connection

                      if(!attempt){
                        setTimeout(()=>{
                          console.log('Trying stream again after 5 seconds');
                          actions.beginMonitor(monitorData.dealId,monitorData.dealRef,monitorData.epic,monitorData.streamLogDir,true);
                        },5000);
                      } else{
                          console.log('Tried but still getting no stream connection. No monitor started. Giving up');
                          return false;
                      }

                    }
                    }).catch(error => {
                      console.log('Thrown error, stopping monitor - ');
                      console.error(error);
                      let ep = monitorData.streamLogDir.split('/')[2];
                      console.log('epic before stopMonitor(): ' + ep);
                      actions.stopMonitor(timer,ep);
                      return false;
                    });

                  } else {
                    console.log('stream is already running for epic:' + monitorData.epic);
                    console.log(monitorData);
                    console.log(isStreamRunning);
                  }

          }
      });

      //after looping through positions, handle if nothing found
      if(positionFound == false){
        console.log('position not found with dealId: ' + arr.dealId + ' but should be, going again in 1 minute...');
        if(typeof arr.dealId == 'undefined'){ console.log('dealId is undefined, stopping monitoring.'); return false; }

        //Check for closed position
        await actions.checkCloseTrade(arr.dealId).then(async r => {
          console.log('Closed position found on API. Closed position.');
        }).catch(e => { console.log('No closed positions found.'); });


        //THIS IS INCORRECT. An open position has a different DealId to a closed position, that was the confusion
        //check if dealID has changed or is mismatched
        // check.actions.checkIncorrectDeal(arr.dealId).then(r => {
        //   console.log('Found matching position with different dealId, dealID has been updated.');
        //   setTimeout(()=>{
        //     console.log('No matching positions found. Trying stream again in 1 minute');
        //     actions.beginMonitor(arr.dealId,arr.dealRef,arr.epic,streamLogDir,true);
        //   },60000);
        // }).catch(e => {
        //
        //   if(!attempt){
        //     setTimeout(()=>{
        //       console.log('No matching positions found. Trying stream again after 5 seconds');
        //       actions.beginMonitor(arr.dealId,arr.dealRef,arr.epic,streamLogDir,true);
        //     },5000);
        //   } else{
        //       console.log('Tried stream already, no matching positions found, giving up.');
        //       actions.stopMonitor(timer,monitorData.epic);
        //       return false;
        //   }
        //
        // });


      }

      // const position = positionsData.positions[0].position;
      //
      // console.log(position);
      //
      // let openLevel = position.openLevel;
      // let limitLevel = position.limitLevel;
      // let stopLevel = position.stopLevel;
      // let direction = position.direction;
      // let dId = position.dealId;

    } else{
      //console.log('no opens positions found but should be, going again....');
      if(typeof dealId == 'undefined'){ console.log('dealId is undefined, stopping monitoring.'); return false; }

      //show working orders (not open positions yet)
      console.log('Checking working orders:');
      await api.showWorkingOrders().then(async workingOrders => {
        console.log(util.inspect(workingOrders, false, null));
        if(workingOrders.length > 0){
          workingOrders.forEach(workingOrder =>{
            if(dealId == workingOrder.workingOrderData.dealId){
              console.log('dealId found as working order, position still being processed..');
            }
          });
        }
      });

      //check if deal is already closed (If the market moves quicker than the deal being processed and monitor setting up)
      console.log('Checking confirmation of deal: ');
      await api.confirmPosition(dealRef).then(async r =>{
        console.log(util.inspect(r.affectedDeals, false, null));
        console.log(util.inspect(r.reason, false, null));
      });


      setTimeout(()=>{
        console.log('waiting 10 minutes, then will check for open positions again.');
        actions.beginMonitor(dealId,dealRef,epic,streamLogDir,false);
      },600000);
    }
  }).catch(error => console.error(error));

}

actions.stopMonitor = async function(timer,epic = false){
  console.log('stopping monitor, epic: ' + epic);

  clearInterval(timer);

  //if epic parameter, stop stream
  if(!!epic){
    console.log('epic is not false, ending stream and monitor logs');
    try{
      stream.actions.unsubscribe(epic);
    } catch(e){
    }
    await log.actions.closeMonitorLog(epic);

    setTimeout(()=>{
      if(monitors.length == 0){
        console.log('No positions being monitored. Disconnecting from lighstreamer');
        stream.actions.disconnectStream();
      }
    },3000);

  }

  var mailOptions = {
    from: 'contact@milesholt.co.uk',
    to: 'miles_holt@hotmail.com',
    subject: 'Monitor has stopped. Epic: ' + epic,
    text: 'Monitoring has stopped.'
  };
  mailer.actions.sendMail(mailOptions);

  return false;
}

module.exports = {
  actions: actions
}
