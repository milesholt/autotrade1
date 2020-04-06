//If restarting, don't forget to export these variables in terminal
//export IG_API_KEY...
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

//Require main backtest
const main = require('./main-backtest.js');
//Require analytics
const analytics = require('../strategies/analytics-backtest.js');

//Parameters
let checks = false;
let prices;
let pricedata = {'support': [], 'resistance': []};
global.confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;
global.priceperpoint = 0.5; //minimum is 0.5
const epic = 'CS.D.BITCOIN.TODAY.IP';
const resolution = 'HOUR';
const date1 = moment().add(1, 'days').format('YYYY-MM-DD');
const date2 = moment(date1).subtract(2, 'weeks').format('YYYY-MM-DD');
let timestamp  = moment().format('LLL');
let strategydata = [];
let tradeActivity = [];
let apidata = [];
let setlimit = 2;
let priceindex = 73;
let isTradeTest = false;

var pricehistoryDir = path.join(__dirname, 'backtests/apidata/pricehistory.json');
var strategyDir = path.join(__dirname, 'backtests/strategydata.json');


//Execute main function
exec();

//Begin Exec function
async function exec(){

  console.log('--------BEGIN EXEC AUTO TRADE');

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Retrieve data from epic
  // console.log('-------Retreiving historic pricing data for epic');
  // const from = date2+'%20'+'00:00:00';
  // const to = date1+'%20'+'00:00:00';
  // await api.histPrc(epic, resolution, from, to).then(r => {
  //   prices = r.prices;
  //   fs.writeFile(pricehistoryDir, JSON.stringify(prices), 'utf8', (e) => {
  //     if (e) {
  //       console.log('Could not write price data');
  //     } else {
  //       console.log('Price data written to file.');
  //     }
  //   });
  // }).catch(e => console.log(e));

  prices = require(pricehistoryDir);

  //push 3 days of data to apidata
  for(let i=0,len=72;i<=len;i++){
    apidata.push(prices[i]);
  }

  //start with an empty
  //push the first three days
  //then loop through each hour, adding one, and removing the first
  await testStrategy(priceindex, apidata);

}

async function testStrategy(i, data){

    if(i == prices.length) {
      console.log('Finished looping through data.');

      //console.log(strategydata);
      calcTest(strategydata);



      // fs.writeFile(strategyDir, JSON.stringify(strategydata), 'utf8', (e) => {
      //     if (e) {
      //       console.log('Could not write price data');
      //     } else {
      //       console.log('Strategy data written to file.');
      //     }
      // });

      // await calcTest();
      // await genReport();
      // console.log('---------------TRADING ACTIVITY SUMMARY:');
      // console.log(tradeActivity);
      // let total = 0;
      // tradeActivity.forEach(act =>{
      //  total += act.profitLossIncome;
      // });
      // console.log('Total income: £' + total);
      // return false;

    } else {

      //removefirst and push next
      data.shift();
      data.push(prices[i]);
      //console.log('---------------------------------------'+ parseInt(i));
      await main.actions.exec(epic, data).then(async r => {
        if(Object.keys(r.ticket).length > 0) {
          r.pid = i;
          strategydata.push(r);
        }
        //strategydata.push(r);
        i++;
        await testStrategy(i,data);
      });
  }

}

async function calcTest(trades){

  let log = [];
  let results = {losses:0, profits:0};

  trades.forEach(async (trade,i) =>{

      const close = trade.lastClose;
      const limitDist = trade.ticket.limitDistance;
      const stopDist = trade.ticket.stopDistance;
      const direction = trade.ticket.direction;
      const limit = direction == 'BUY' ? close + limitDist : close - limitDist;
      const stop = direction == 'BUY' ? close - stopDist: close + stopDist;

      const tradeInfo = {
        time : trade.lastTime,
        close : trade.lastClose,
        closeAsk : trade.lastCloseAsk,
        closeBid : trade.lastCloseBid,
        pid : trade.pid,
        limitDist : trade.ticket.limitDistance,
        stopDist : trade.ticket.stopDistance,
        direction : trade.ticket.direction,
        limit : limit,
        stop : stop
      }


      let nextprice = (trade.pid+1);
      await calcTest2(nextprice, tradeInfo, log, results);

  });

  console.log(log);
  console.log(results);

}

async function calcTest2(i, tradeInfo, log, results){

    if(i == prices.length) {
      console.log('Finished looping through data. calcTest2');
      return;
    }else{
      let closePos = false;
      let movement = 0;
      let p = prices[i];
      let pp = prices[i-1];
      let close = p.closePrice.ask - (parseInt(p.closePrice.ask - p.closePrice.bid)/2);
      let prevclose = pp.closePrice.ask - (parseInt(pp.closePrice.ask - pp.closePrice.bid)/2);
      let diff = Math.abs(close - prevclose);
      if(close > prevclose) movement += diff;
      if(close < prevclose) movement -= diff;

      if(tradeInfo.direction == 'SELL' && (p.closePrice.bid >= tradeInfo.stop)) closePos = true;
      if(tradeInfo.direction == 'SELL' && (p.closePrice.bid <= tradeInfo.limit)) closePos = true;
      if(tradeInfo.direction == 'BUY' && (p.closePrice.ask <= tradeInfo.stop)) closePos = true;
      if(tradeInfo.direction == 'BUY' && (p.closePrice.ask >= tradeInfo.limit)) closePos = true;

      if(closePos){

        let result = 'PROFIT';
        if(tradeInfo.direction == 'SELL' && movement > 0) result = 'LOSS';
        if(tradeInfo.direction == 'BUY' && movement < 0) result = 'LOSS';

        log.push({
            tradeTime: tradeInfo.time,
            tradeDirection: tradeInfo.direction,
            marketPrice: (tradeInfo.direction == 'BUY' ? tradeInfo.closeAsk : tradeInfo.closeBid),
            closePosTime: p.snapshotTime,
            closeAsk: p.closePrice.ask,
            closeBid: p.closePrice.bid,
            close: close,
            limit: tradeInfo.limit,
            stop: tradeInfo.stop,
            movement: Math.round(movement),
            result: result
        });

        if(result == 'PROFIT') results.profits++;
        if(result == 'LOSS') results.losses++;

        return;

      } else{
        i++;
        await calcTest2(i, tradeInfo, log, results);
      }
    }
}
