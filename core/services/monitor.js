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

  //streamLogDir = path.join(__dirname, '../data/streams/'+epic+'_stream.json');
  let data = '';


  console.log(process.env.HOME);
  console.log(__dirname);

  //if stream file doesn't exist, create it (w flag)
  await fs.writeFile(streamLogDir, data, { flag: 'w' }, function (err) {
    if (err) throw err;
  });
  //begin monitoring
  actions.beginMonitor(dealId,dealRef,epic,streamLogDir);
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

  //get open position information

  await api.showOpenPositions(1).then(async (positionsData) => {
    console.log(util.inspect(positionsData, false, null));

    if(Object.keys(positionsData).indexOf('confirms') !== -1){
      let status = positionsData.confirms.dealStatus;
      if(status == 'REJECTED'){
        console.error('deal was rejected');
        return console.error(positionsData.confirms.reason);
      }
    }

    if(positionsData.positions.length){

      positionsData.positions.forEach(async (trade,i) => {
          if(trade.position.dealId == dealId){

                    const p = trade.position;
                    epic = arr.epic;

                    //log monitor
                    await log.actions.startMonitorLog();

                    //declare time before reading stream
                    var timer;

                    //start stream
                    //use real-time streaming to get latest hour
                    console.log('starting stream, epic: ' + epic);
                    await stream.actions.startStream(epic,streamLogDir);
                    console.log('streamLogDir: ' + streamLogDir);
                    await stream.actions.readStream(streamLogDir,false).then(r => {

                      let closeprofit = false;
                      let closeloss = false;

                      console.log('position data:');
                      console.log(p);


                      let limitDiff = lib.actions.toNumber(Math.abs(p.openLevel - p.limitLevel) / 2);

                      console.log(limitDiff);

                      let newlimitBuy = lib.actions.toNumber(p.openLevel + limitDiff);
                      let newlimitSell = lib.actions.toNumber(p.openLevel - limitDiff);
                      let newlimit = direction == 'BUY' ? newlimitBuy : newlimitSell;

                      console.log('new limit is: ' + newlimit);

                      let monitorAnalysis = {
                        limitLevel: p.limitLevel,
                        stopLevel: p.stopLevel,
                        newLimit: newlimit,
                        openLevel: p.openLevel,
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
                                let time = moment(data[0]).format('YYYY-MM-DD HH:mm:ss');
                                //get epic related to stream
                                let ep = data[1];

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

                                //our settings
                                //half the limit level
                                if(direction == 'BUY' && d.closePrice.bid >= newlimit) closeprofit = true;
                                if(direction == 'SELL' && d.closePrice.ask <= newlimit) closeprofit = true;

                                //stopLevel remains as is
                                if(direction == 'BUY' && d.closePrice.bid <= p.stopLevel) closeloss = true;
                                if(direction == 'SELL' && d.closePrice.ask >= p.stopLevel) closeloss = true;

                                let closePrice = direction == 'BUY' ? d.closePrice.bid : d.closePrice.ask;



                                  if(closeprofit){

                                    console.log('close profit');

                                    let m = {};

                                    await log.actions.getMonitorLog(ep).then(r =>{
                                      m = {
                                        epic : r.epic,
                                        dealId: r.dealId,
                                        dealRef: r.dealRef,
                                        streamLogDir: r.streamLogDir
                                      }
                                    }).catch(e => { console.log(e) });

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
                                      openLevel: p.openLevel,
                                      data: d,
                                      dealId: m.dealId
                                    }

                                    api.closePosition(m.dealId).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
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
                                  }

                                  if(closeloss){

                                    console.log('close loss');

                                    let m = {};

                                    await log.actions.getMonitorLog(ep).then(r =>{
                                      m = {
                                        epic : r.epic,
                                        dealId: r.dealId,
                                        dealRef: r.dealRef,
                                        streamLogDir: r.streamLogDir
                                      }
                                    }).catch(e => { console.log(e) });

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
                                      openLevel: p.openLevel,
                                      data: d,
                                      dealId: m.dealId
                                    }
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
                                    openLevel: p.openLevel,
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
                          }
                        });
                      },3000);
                    }).catch(error => {
                      console.log('Thrown error, stopping monitor - ');
                      console.error(error);
                      let ep = streamLogDir.split('/')[2];
                      console.log('epic before stopMonitor(): ' + ep);
                      actions.stopMonitor(timer,ep);
                    });

          } else {
            console.log('position not found with dealId: ' + dealId + ' but should be, going again in 1 minute...');
            if(typeof dealId == 'undefined'){ console.log('dealId is undefined, stopping monitoring.'); return false; }
            setTimeout(()=>{
              actions.beginMonitor(dealId,dealRef,epic,streamLogDir);
            },60000);

          }
      });

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
        actions.beginMonitor(dealId,dealRef,epic,streamLogDir);
      },60000);
    }
  }).catch(error => console.error(error));

}

actions.stopMonitor = async function(timer,epic = false){
  console.log('stopping monitor, epic: ' + epic);

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

  clearInterval(timer);
  return false;
}

module.exports = {
  actions: actions
}
