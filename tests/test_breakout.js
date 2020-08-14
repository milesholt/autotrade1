//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');

moment().format();

const strategy = require('../strategies/breakoutStrategy.js');
const analytics = require('../services/tests/analytics.js');

var pricesDir = path.join(__dirname, '../pricedata.json');

let pricedata = {'support': [], 'resistance': []};
let pricedata2 = {'support': [], 'resistance': []};
let pricedata3 = {'support': [], 'resistance': []};
global.rangedata = {'resistance': {}, 'support': {}, 'bumps': []};
global.linedata = {'support': 0, 'resistance': 0, 'midrange': 0};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

let prices = require(pricesDir);

exec(prices);

async function exec(prices){

  prices.forEach((price,idx) =>{
    if(price !== null){
      let time =  price.snapshotTime.replace(/\//g, '-');
      let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
      let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
      let midHigh = price.highPrice.ask - (parseInt(price.highPrice.ask - price.highPrice.bid)/2);
      let midLow = price.lowPrice.ask - (parseInt(price.lowPrice.ask - price.lowPrice.bid)/2);
      let askClose = price.closePrice.ask;
      let bidClose = price.closePrice.bid;
      let supportprice = midOpen <= midClose ? midOpen : midClose;
      let resistprice = midOpen >= midClose ? midOpen : midClose;
      pricedata.support.push({'price': supportprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
      pricedata.resistance.push({'price': resistprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
    }else{
      loop('Price undefined? Waiting an hour and trying again');
      return false;
    }
  });

  let start = (pricedata.support.length - 25);
  pricedata2.support = pricedata.support.filter((price,i) => i > start);
  pricedata2.resistance = pricedata.resistance.filter((price,i) => i > start);

  let start2 = (pricedata.support.length - 37);
  pricedata3.support = pricedata.support.filter((price,i) => i > start2);
  pricedata3.resistance = pricedata.resistance.filter((price,i) => i > start2);

  //console.log(pricedata2.support);

  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata2,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata2,'resistance');

  linedata.support = supportline;
  linedata.resistance = resistanceline;

  analytics.actions.drawChart(pricedata3.support, {}, linedata, {}, rangedata);

}
