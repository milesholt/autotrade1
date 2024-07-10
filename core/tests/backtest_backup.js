

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
let setlimit = 2;
let isTradeTest = false;

var pricehistoryDir = path.join(__dirname, 'backtests/apidata/pricehistory.json');
//To test a specific trade that was made, put the dates recorded in that trade, in this file:
var priceTestDir = path.join(__dirname, 'backtests/apidata/pricetest.json');

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

  //prices = require(pricehistoryDir);
  prices = require(priceTestDir);
  isTradeTest = true;
  //console.log(prices);

  let data = [];

  if(!isTradeTest){
    //sort price history into an array of 3 days
    //because in real, for every hour we would get the last 3 days each time
    let set = [];
    let day = 0;
    let days = 0;
    prices.forEach((price,i) => {
      let time = price.snapshotTime.replace(/\//g, '-');
      let timeformat = moment(time).format('YYYY-MM-DD').split('-');
      let day2 = timeformat[2];
      if(i==0) day = day2;
      if(day2 !== day){
        days++;
        day = day2;
      }
      set.push(price);
      if(days == 3){
        data.push(set);
        set = [];
        days = 0;
      }
    });

    //console.log(data);

    //for every 3 days of history prices, we backtest strategy
    // console.log('data length:' + data.length);
    // setlimit = data.length -1;
    // await testStrategy(0,data);

    //only test one dataset of 3 days
    console.log(data.length);
    //let index = parseInt(data.length - 5);
  } else {
    //testing on one specific trade
    data.push(prices);

  }

  console.log(data);
  let index = 0; //to test only the first set of one week
  first = index;
  setlimit = 0;
  await testStrategy(first, data);

}

async function testStrategy(i, data){
  let dataset = data[i];

  console.log('---------------------------------------'+ parseInt(i));
  await main.actions.exec(epic, dataset).then(async r => {
    strategydata.push(r);

    if(i == setlimit) {
      console.log('Finished looping through data.');
      await calcTest();
      await genReport();
      console.log('---------------TRADING ACTIVITY SUMMARY:');
      console.log(tradeActivity);
      let total = 0;
      tradeActivity.forEach(act =>{
       total += act.profitLossIncome;
      });
      console.log('Total income: £' + total);
      return false;
    }
    i++;
    await testStrategy(i,data);
  });
}

async function genReport(){
  //console.log(util.inspect(strategydata,false,null));
  let prices = [];
  strategydata.forEach(data => {
    prices = prices.concat(data.pricedata.support);
  });
  //console.log(strategydata);
  //console.log(strategydata[0]);
  //console.log(prices);
  analytics.actions.drawChart(prices, strategydata, tradeActivity);
}

async function calcTest(){
  let tradePrice = 0;
  let tradeDiff = 0;
  let limit = 0;
  let stop = 0;
  let trade = {};

  //loop through price bars (historyprice data)
  prices.forEach((price,idx) => {
    //if on next price bar, market price reaches limit or stop value,
    //set that close price as trade price, calculate profit/loss of trade price
    //push everything to proft / loss data

    if(Object.keys(trade).length){
      console.log('index:' + idx);
      console.log('trade exists');
      console.log(trade);

      let closePrice = trade.action == 'BUY' ? price.closePrice.ask : price.closePrice.bid;

      let result = '';
      switch(trade.action){
        case 'BUY':
          if(closePrice >= trade.limit){
            trade.profitLossPoints = closePrice - trade.limit;
            trade.profitLossIncome = Math.round(trade.profitLossPoints) * priceperpoint;
            result = 'PROFIT';
          }
          if(closePrice <= trade.stop){
            trade.profitLossPoints = closePrice - trade.stop;
            trade.profitLossIncome = Math.round(trade.profitLossPoints) * priceperpoint;
            result = 'LOSS';
          }
        break;
        case 'SELL':
          if(closePrice <= trade.limit){
            trade.profitLossPoints = trade.limit - closePrice;
            trade.profitLossIncome = Math.round(trade.profitLossPoints) * priceperpoint;
            result = 'PROFIT';
          }
          if(closePrice >= trade.stop){
            trade.profitLossPoints = trade.stop - closePrice;
            trade.profitLossIncome = Math.round(trade.profitLossPoints) * priceperpoint;
            result = 'LOSS';
          }
        break;
      }
      trade.result = result;
      if(trade.profitLoss !== 0) tradeActivity.push(trade);
      trade = {};
    }

    //otherwise for each price bar
    //loop through strategydata
    strategydata.forEach((data,sidx) => {

      //if lastTime matches with time of price bar
      let pricetime =  price.snapshotTime.replace(/\//g, '-');
      if(data.lastTime == pricetime){



        //is there a ticket?
        if(Object.keys(data.ticket).length){
          //console.log('time match:' + pricetime);


          //if true, calc difference between market price (last close mid price) and ask/bid price
          //this will determine how much we are under or over by
          //and set trade price we have bought/sold as
          tradePrice = data.ticket.direction == 'BUY' ? data.lastCloseAsk : data.lastCloseBid;
          tradeDiff = data.lastClose - tradePrice;
          //set limit and stop values from ticket
          let limitDist = data.ticket.limitDistance;
          let stopDist = data.ticket.stopDistance;
          limit = data.ticket.direction == 'BUY' ? tradePrice + limitDist: tradePrice - limitDist;
          stop = data.ticket.direction == 'BUY' ? tradePrice - stopDist : tradePrice + stopDist;

          trade = {
            'priceidx':sidx,
            'time': pricetime,
            'tradePrice': tradePrice,
            'tradeDiff': tradeDiff,
            'limit': limit,
            'stop': stop,
            'action': data.ticket.direction,
            'result':'',
            'profitLossPoints':0,
            'profitLossIncome':0
          }


          //continue looping through price bars
        }
      }
    });
  });

}
