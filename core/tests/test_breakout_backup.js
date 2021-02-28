//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const http = require('http');
const path = require('path');
const open = require('open');

moment().format();

const strategy = require('../strategies/tests/breakoutStrategy.js');
const analytics = require('../services/tests/analytics0.js');


// var pricesDir1 = path.join(__dirname, './test_pricedata1.json');
// var pricesDir2 = path.join(__dirname, './test_pricedata2.json');
// var pricesDir4 = path.join(__dirname, './test_pricedata4.json');
// var pricesDir5 = path.join(__dirname, './test_pricedata5.json');
// var pricesDir6 = path.join(__dirname, './test_pricedata6.json');
// var pricesDir7 = path.join(__dirname, './test_pricedata7.json');
// var pricesDir8 = path.join(__dirname, './test_pricedata8.json');
// var pricesDir9 = path.join(__dirname, './test_pricedata9_norange.json');
// var pricesDir10 = path.join(__dirname, './test_pricedata10.json');

//let pricedata = {'support': [], 'resistance': []};
let pricedata2 = {'support': [], 'resistance': []};
let pricedata3 = {'support': [], 'resistance': []};
global.rangeData = {'resistance': {}, 'support': {}, 'bumps': [], 'waves': []};
global.lineData = {'support': 0, 'resistance': 0, 'midrange': 0};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

// let pricedata1 = require(pricesDir1);
// let pricedata2 = require(pricesDir2);
// //let pricedata3 = require(pricesDir3);
// let pricedata4 = require(pricesDir4);
// let pricedata5 = require(pricesDir5);
// let pricedata6 = require(pricesDir6);
// let pricedata7 = require(pricesDir7);
// let pricedata8 = require(pricesDir8);
// let pricedata9 = require(pricesDir9);
// let pricedata10 = require(pricesDir10);

pricedatacount = 11;
pricedataselect = [3]; //this overides pricedatacount

begin(0);

// for(let i=1,len=pricedatacount;i<=len;i++){
//    var pricesDir = path.join(__dirname, './test_pricedata'+i+'.json');
//    let pricedata = require(pricesDir);
//    exec(pricedata);
// }


async function begin(idx){
  //if we are selecting specific graphs, this overides count

  const isSelect = pricedataselect.length > 0 ? true : false;
  const count = isSelect ? pricedataselect.length : pricedatacount;
  let id = isSelect ? pricedataselect[idx] : (idx+1);

  if(idx == count) return false;
  var pricesDir = path.join(__dirname, './test_pricedata'+id+'.json');
  let pricedata = require(pricesDir);
  await exec(pricedata,id);
  idx++
  begin(idx);
}


async function exec(pricedata,id){

  // prices.forEach((price,idx) =>{
  //   if(price !== null){
  //     let time =  price.snapshotTime.replace(/\//g, '-');
  //     let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
  //     let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
  //     let midHigh = price.highPrice.ask - (parseInt(price.highPrice.ask - price.highPrice.bid)/2);
  //     let midLow = price.lowPrice.ask - (parseInt(price.lowPrice.ask - price.lowPrice.bid)/2);
  //     let askClose = price.closePrice.ask;
  //     let bidClose = price.closePrice.bid;
  //     let supportprice = midOpen <= midClose ? midOpen : midClose;
  //     let resistprice = midOpen >= midClose ? midOpen : midClose;
  //     pricedata.support.push({'price': supportprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
  //     pricedata.resistance.push({'price': resistprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
  //   }else{
  //     loop('Price undefined? Waiting an hour and trying again');
  //     return false;
  //   }
  // });

  let start = (pricedata.support.length - 25);
  pricedata2.support = pricedata.support.filter((price,i) => i > start);
  pricedata2.resistance = pricedata.resistance.filter((price,i) => i > start);

  let start2 = (pricedata.support.length - 37);
  pricedata3.support = pricedata.support.filter((price,i) => i > start2);
  pricedata3.resistance = pricedata.resistance.filter((price,i) => i > start2);

  //console.log(pricedata2.resistance);
  //console.log(pricedata2.support);

  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata2,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata2,'resistance');

  lineData.support = supportline;
  lineData.resistance = resistanceline;

  //console.log(rangeData.waves);

  await analytics.actions.drawChart(pricedata3.support, lineData, {}, rangeData, 'pricedata'+id);


  //write config

  let c={
    select : pricedataselect,
    count: pricedatacount
  }
  let config = 'var config='+JSON.stringify(c);
  var jsonDir = path.join(__dirname, '../services/external/plotly/config.js');
  fs.writeFileSync(jsonDir, config);

  //file:///C:/xampp/htdocs/autotrade1/core/services/external/plotly/index.html

  //console.log('file:///C:/Users/miles/Development/autotrade1/core/services/external/plotly/index.html');

  //var graphpath = path.join(__dirname, '../services/external/plotly/index.html?d=test');

  //console.log(graphpath);

  //open(graphpath);



  // fs.readFile('../services/external/plotly/index.html', function (err, html) {
  //     if (err) {
  //         throw err;
  //     }
  //     http.createServer(function(request, response) {
  //         response.writeHeader(200, {"Content-Type": "text/html"});
  //         response.write(html);
  //         response.end();
  //     }).listen(8000);
  // });

}
