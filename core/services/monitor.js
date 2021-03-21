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
const github = require('./github.js');
const testmailer = require('../tests/mailer.js');
//Stream log
//var streamLogDir = path.join(__dirname, './stream.json');
//var streamLogDir = '';


actions.iniMonitor = async function(dealId,dealRef,epic){

  console.log('ini monitor');
  console.log(epic);

  //streamLogDir = path.join(__dirname, '../data/streams/'+epic+'_stream.json');
  let data = '';


  console.log(process.env.HOME);
  console.log(__dirname);

  //if stream file doesn't exist, create it (w flag)
  await fs.writeFile(streamLogDir, data, { flag: 'w' }, function (err) {
    if (err) throw err;
  });
  //begin monitoring
  await actions.beginMonitor(dealId,dealRef,epic,streamLogDir);
}

actions.beginMonitor = async function(dealId,dealRef,epic,streamLogDir){
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

  //get open position information

  await api.showOpenPositions().then(async (positionsData) => {
    //console.log(util.inspect(positionsData, false, null));

    if(Object.keys(positionsData).indexOf('confirms') !== -1){
      let status = positionsData.confirms.dealStatus;
      if(status == 'REJECTED'){
        console.error('deal was rejected');
        return console.error(positionsData.confirms.reason);
      }
    }
    let positionFound = false;

    if(positionsData.positions.length){

      positionsData.positions.forEach(async (trade,i) => {
          if(trade.position.dealReference == arr.dealRef){

                    //retrieve dealId if undefined
                    if(typeof arr.dealId == 'undefined') {
                      arr.dealId = trade.position.dealId;
                      console.log('dealId was undefined, is now: ' + arr.dealId);
                    }

                    positionFound = true;
                    console.log('Position found for dealRef: ' + arr.dealRef);

                    const p = trade.position;

                    console.log(arr.epic);
                    epic = arr.epic;
                    dealId = arr.dealId;

                    //log monitor
                    console.log(arr.dealId)
                    console.log(dealId);
                    await log.actions.startMonitorLog(dealId);

                    //declare time before reading stream
                    var timer;

                    //start stream
                    //use real-time streaming to get latest hour
                    console.log('starting stream, epic: ' + epic);
                    await stream.actions.startStream(epic,streamLogDir,p);
                    console.log('streamLogDir: ' + streamLogDir);
                    await stream.actions.readStream(streamLogDir,false).then(async r => {

                      let closeprofit = false;
                      let closeloss = false;

                      // console.log('position data:');
                      // console.log(p);

                      console.log('response:');
                      console.log(r);


                      let limitDiff = lib.actions.toNumber(Math.abs(p.level - p.limitLevel) * limitClosePerc);
                      let stopDiff = lib.actions.toNumber(Math.abs(p.level - p.stopLevel) * stopClosePerc);

                      console.log(limitDiff);

                      let newlimitBuy = lib.actions.toNumber(p.level + limitDiff);
                      let newlimitSell = lib.actions.toNumber(p.level - limitDiff);
                      let newStopBuy = lib.actions.toNumber(p.level - stopDiff);
                      let newStopSell = lib.actions.toNumber(p.level + stopDiff);
                      let newlimit = direction == 'BUY' ? newlimitBuy : newlimitSell;
                      let newStop = direction == 'BUY' ? newStopBuy : newStopSell;

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
                        subject: 'Started monitoring trade - ANALYSIS ' + moment().format('LLL'),
                        text: JSON.stringify(monitorAnalysis)
                      };
                      mailer.actions.sendMail(mailOptions);

                      var counter = 0;
                      timer = setInterval(()=>{

                        counter += 3;

                        //NOTE - This is reading from the streamLog being written in Heroku server, not Github!
                        //So the data written to Github is after this is read, which is in a different structure

                        fs.readFile(streamLogDir, async function (err, data) {
                          if (err) {
                            actions.stopMonitor(timer);
                            return console.error(err);
                          }


                          if (/^[\],:{}\s]*$/.test(data.toString().replace(/\\["\\\/bfnrtu]/g, '@').
                           replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
                           replace(/(?:^|:|,)(?:\s*\[)+/g, '')) && typeof data !== null && typeof data !== undefined && data.length > 0) {
                                //the json is ok

                                data = JSON.parse(data.toString());

                                // console.log('reading data from this file: ' + streamLogDir);
                                // console.log(data);

                                let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
                                //get epic related to stream
                                let ep = data[1];
                                let dir = p.direction;

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
                                  console.log('price data is returning NaN, market has potentially closed while monitoring. Stopping monitoring...');
                                  actions.stopMonitor(timer,ep);
                                  return false;
                                }

                                //if stream price goes beyond settings, take action

                                //NOTE: If you're selling to open then you are buying to close.
                                //So if your are SELLING you close at the ASK price. If your are BUYING, you close at the BID price.
                                //console.log('EPIC: ' + ep);
                                //console.log('DATA: ');
                                //console.log(p);

                                //our settings
                                //use new limit level
                                if(dir == 'BUY' && d.closePrice.bid >= newlimit) closeprofit = true;
                                if(dir == 'SELL' && d.closePrice.ask <= newlimit) closeprofit = true;

                                //suse new stop level
                                if(dir == 'BUY' && d.closePrice.bid <= newStop) closeloss = true;
                                if(dir == 'SELL' && d.closePrice.ask >= newStop) closeloss = true;

                                let closePrice = dir == 'BUY' ? d.closePrice.bid : d.closePrice.ask;
                                let foundMonitor =  false;


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
                                      console.log('new limit was: ' + newlimit);
                                      console.log('closing price was: ' + closePrice);
                                      console.log('closing price (ask) was: ' + d.closePrice.ask);
                                      console.log('closing price (bid) was: ' + d.closePrice.bid);

                                      console.log('PROFIT - Finished monitoring, positions should be closed. Ending stream.');

                                      let closeAnalysis = {
                                        timestamp: Date.now(),
                                        date: moment().format('LLL'),
                                        limitLevel: p.limitLevel,
                                        stopLevel: p.stopLevel,
                                        newLimit: newlimit,
                                        lastClose: closePrice,
                                        direction: p.direction,
                                        openLevel: p.level,
                                        data: d,
                                        dealId: m.dealId,
                                        profit:null
                                      }

                                      await api.closePosition(m.dealId).then(async r =>{
                                        console.log(util.inspect(r, false, null));
                                        closeAnalysis.profit = r.confirms.profit;

                                        //get confirmation of position with recorded profit price from server
                                        // await api.confirmPosition(dealRef).then(async positionData =>{
                                        //    //should be positionData.profit
                                        //    console.log(util.inspect(positionData, false, null));
                                        //    closeAnalysis.profit = positionData.confirms.profit;
                                        // }).catch(e => console.log(e));


                                      }).catch(e => console.log(e));

                                      var mailOptions = {
                                        from: 'contact@milesholt.co.uk',
                                        to: 'miles_holt@hotmail.com',
                                        subject: 'Closed position, new limit reached. PROFIT ' + moment().format('LLL'),
                                        text: JSON.stringify(closeAnalysis)
                                      };
                                      mailer.actions.sendMail(mailOptions);
                                      actions.stopMonitor(timer, m.epic);
                                      log.actions.closeTradeLog(m.epic,closeAnalysis);
                                      github.actions.updateFile({}, m.streamLogDir);

                                      return false;
                                    } else {

                                      console.log('Couldnt find monitor data, doing nothing');
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
                                    }).catch(e => { console.log(e) });

                                    if(foundMonitor == true){
                                      console.log(m);

                                      console.log('Stop level reached. Closing position.');
                                      console.log('stop level was: ' + p.stopLevel);
                                      console.log('closing price was: ' + closePrice);
                                      console.log('closing price (ask) was: ' + d.closePrice.ask);
                                      console.log('closing price (bid) was: ' + d.closePrice.bid);

                                      console.log('LOSS - Finished monitoring, positions should be closed. Ending stream.');

                                      let closeAnalysis = {
                                        timestamp: Date.now(),
                                        date: moment().format('LLL'),
                                        limitLevel: p.limitLevel,
                                        stopLevel: p.stopLevel,
                                        lastClose: closePrice,
                                        direction: p.direction,
                                        openLevel: p.level,
                                        data: d,
                                        dealId: m.dealId,
                                        profit:null
                                      }


                                      await api.closePosition(m.dealId).then(async r =>{
                                        console.log(util.inspect(r, false, null));
                                        closeAnalysis.profit = r.confirms.profit;

                                        //get confirmation of position with recorded profit price from server
                                        // await api.confirmPosition(dealRef).then(async positionData =>{
                                        //    //should be positionData.profit
                                        //    console.log(util.inspect(positionData, false, null));
                                        //    closeAnalysis.profit = positionData.confirms.profit;
                                        // }).catch(e => console.log(e));


                                      }).catch(e => console.log(e));

                                      var mailOptions = {
                                        from: 'contact@milesholt.co.uk',
                                        to: 'miles_holt@hotmail.com',
                                        subject: 'Closed position, hit stop level. LOSS ' + moment().format('LLL'),
                                        text: JSON.stringify(closeAnalysis)
                                      };
                                      mailer.actions.sendMail(mailOptions);
                                      actions.stopMonitor(timer, m.epic);
                                      log.actions.closeTradeLog(m.epic,closeAnalysis);
                                      //update stream data
                                      github.actions.updateFile({}, m.streamLogDir);
                                      return false;

                                    } else {
                                      console.log('Couldnt find monitor data, doing nothing');
                                      return false;
                                    }


                                  }

                                  //get modification time of file
                                  const stats = fs.statSync(streamLogDir);
                                  const modtime = moment(stats.mtime).format('LT');
                                  let timestamp = Date.now();

                                  //console.log('close price: ' + closePrice + ' newlimit: ' + newlimit + ' stoplevel: ' + stopLevel + ' updated: ' + modtime);
                                  //console.log('epic: ' + ep + ' close ask: ' + d.closePrice.ask + 'close bid: ' + d.closePrice.bid + ' newlimit: ' + newlimit + ' stoplevel: ' + p.stopLevel + ' updated: ' + modtime);

                                  let streamdata = {
                                    epic : ep,
                                    closeAsk: d.closePrice.ask,
                                    closeBid: d.closePrice.bid,
                                    newLimit: newlimit,
                                    stopLevel: p.stopLevel,
                                    direction: p.direction,
                                    openLevel: p.level,
                                    updated: modtime,
                                    timestamp: timestamp
                                  }

                                   //update stream data every 60 seconds
                                   //this is to not exceed github api limit
                                  if(counter == 60){
                                    //console.log('resetting counter');
                                    counter = 0;
                                    github.actions.updateFile(streamdata, streamLogDir);
                                  }


                          } else{
                                  //the json is not ok
                                  data = {};
                                  //TO DO: Move to error handling
                                  console.log('Error reading stream, likely JSON data incorrect which suggests market is closed. Ending stream..');
                                  console.log('streamLogDir: ' + streamLogDir);
                                  //we dont have data to catch epic, but we can catch it through passed streamLogDir parameter
                                  let ep = streamLogDir.split('/')[2];
                                  console.log('epic before stopMonitor(): ' + ep);
                                  actions.stopMonitor(timer,ep);
                                  return false;
                          }
                        });
                      },3000);
                    }).catch(error => {
                      console.log('Thrown error, stopping monitor - ');
                      console.error(error);
                      let ep = streamLogDir.split('/')[2];
                      console.log('epic before stopMonitor(): ' + ep);
                      actions.stopMonitor(timer,ep);
                      return false;
                    });

          }
      });

      //after looping through positions, handle if nothing found
      if(positionFound == false){
        console.log('position not found with dealId: ' + arr.dealId + ' but should be, going again in 1 minute...');
        if(typeof arr.dealId == 'undefined'){ console.log('dealId is undefined, stopping monitoring.'); return false; }
        setTimeout(()=>{
          actions.beginMonitor(arr.dealId,arr.dealRef,arr.epic,streamLogDir);
        },60000);
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
        actions.beginMonitor(dealId,dealRef,epic,streamLogDir);
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
    stream.actions.endStream(epic);
    log.actions.closeMonitorLog(epic);
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
