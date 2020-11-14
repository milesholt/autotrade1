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
let direction = '';
let dealId = '';

//Require stream
const stream = require('./stream.js');
//Require mailer
const mailer = require('./mailer.js');
const log = require('./log.js');
const github = require('./github.js');
const testmailer = require('../tests/mailer.js');
//Stream log
//var streamLogDir = path.join(__dirname, './stream.json');
//var streamLogDir = '';


actions.iniMonitor = async function(dealId,epic){

  //streamLogDir = path.join(__dirname, '../data/streams/'+epic+'_stream.json');
  let data = '';

  console.log(process.env.HOME);
  console.log(__dirname);

  //if stream file doesn't exist, create it (w flag)
  await fs.writeFile(streamLogDir, data, { flag: 'w' }, function (err) {
    if (err) throw err;
  });
  //begin monitoring
  actions.beginMonitor(dealId,epic,streamLogDir);
}

actions.beginMonitor = async function(dealId,epic,streamLogDir){
  //login
  // await api.login(true).then(r => {
  //   //console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  console.log('Beginning monitoring, getting open positions..');

  //get open position information

  await api.showOpenPositions().then(async positionsData => {
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

                    //log monitor
                    log.actions.startMonitorLog();

                    //declare time before reading stream
                    var timer;

                    //start stream
                    //use real-time streaming to get latest hour
                    await stream.actions.startStream(epic,streamLogDir);
                    console.log('streamLogDir: ' + streamLogDir);
                    await stream.actions.readStream(streamLogDir,false).then(r => {

                      let closeprofit = false;
                      let closeloss = false;

                      console.log('position data:');
                      console.log(p);


                      let limitDiff = (Math.abs(p.openLevel - p.limitLevel) / 2);

                      console.log(limitDiff);

                      let newlimitBuy = p.openLevel + limitDiff;
                      let newlimitSell = p.openLevel - limitDiff;
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
                                  actions.stopMonitor();
                                } else {
                                  console.log('Stream response good, should be updating.');
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

                                    log.actions.getMonitorLog(ep).then(r =>{
                                      let m = {
                                        epic : r.epic,
                                        dealId: r.dealId,
                                        dealRef: r.dealRef,
                                        streamLogDir: r.streamLogDir
                                      }
                                    }).catch(e => { console.log(e) });

                                    console.log('New limit level reached. Closing position.');
                                    console.log('new limit was: ' + newlimit);
                                    console.log('closing price was: ' + closePrice);
                                    console.log('closing price (ask) was: ' + d.closePrice.ask);
                                    console.log('closing price (bid) was: ' + d.closePrice.bid);

                                    console.log('PROFIT - Finished monitoring, positions should be closed. Ending stream.');
                                    stream.actions.endStream(m.epic);

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
                                    testmailer.actions.testMail();
                                    actions.stopMonitor(timer);
                                    log.actions.closeTradeLog(m.epic,closeAnalysis);
                                    log.actions.closeMonitorLog(m.epic);
                                    github.actions.updateFile({}, m.streamLogDir);

                                    return false;
                                  }

                                  if(closeloss){

                                    log.actions.getMonitorLog(ep).then(r =>{
                                      let m = {
                                        epic : r.epic,
                                        dealId: r.dealId,
                                        dealRef: r.dealRef,
                                        streamLogDir: r.streamLogDir
                                      }
                                    }).catch(e => { console.log(e) });

                                    console.log('Stop level reached. Closing position.');
                                    console.log('stop level was: ' + p.stopLevel);
                                    console.log('closing price was: ' + closePrice);
                                    console.log('closing price (ask) was: ' + d.closePrice.ask);
                                    console.log('closing price (bid) was: ' + d.closePrice.bid);

                                    console.log('LOSS - Finished monitoring, positions should be closed. Ending stream.');
                                    stream.actions.endStream(m.epic);

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
                                    testmailer.actions.testMail();
                                    actions.stopMonitor(timer);
                                    log.actions.closeTradeLog(m.epic,closeAnalysis);
                                    log.actions.closeMonitorLog(m.epic);
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
                          }
                        });
                      },3000);
                    }).catch(error => console.error(error));

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
      console.log('no opens positions found but should be, going again....');
      setTimeout(()=>{
        actions.beginMonitor();
      },2000)
    }
  }).catch(error => console.error(error));


}

actions.stopMonitor = async function(timer){
  console.log('stopping monitor');
  clearInterval(timer);
  return false;
}

module.exports = {
  actions: actions
}
