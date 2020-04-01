// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');
moment().format();

//Require strategy
const strategy = require('../strategies/tests/breakoutStrategy.js');
//Require analytics
const analytics = require('../services/tests/analytics.js');

var pricedataDir = path.join(__dirname, 'backtests/pricedata/pricedata.json');

//Parameters
let actions = {};
let check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false;
let prices;
global.rangedata = {'resistance': {}, 'support': {}};
global.linedata = {'support': 0, 'resistance': 0, 'midrange': 0};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
let confirmationlimit = 3;
let timestamp  = moment().format('LLL');

exec();

async function exec(){


  let pricedata = {'support': [], 'resistance': []};
  let pricedata2 = {'support': [], 'resistance': []};
  confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
  //confirmations = {'resistance': 0, 'support': 0};
  check0 = false, check1 = false, check2 = false, check3 = false, check4 = false;


  const test = require(pricedataDir);
  pricedata = test.data[0].customdata[23].pricedata;



  let start = (pricedata.support.length - 25);
  pricedata2.support = pricedata.support.filter((price,i) => i > start);
  pricedata2.resistance = pricedata.resistance.filter((price,i) => i > start);


  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata2,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata2,'resistance');



  //verify horizontal lines meet conditions
  //must have 50 points minimum distance from each other
  //if are 200 points maximum distance apart, then chart is not considered ranging
  let lineDistance = Math.abs(resistanceline - supportline);
  if((lineDistance > 20 && lineDistance < 200) && (resistanceline > supportline)) check0 = true;

  //Get the percentage change of the first price bar and support/resistance lines
  const firstClose = pricedata2.support[0].close;
  let firstDiff = firstClose > resistanceline ? Math.abs(100 - (resistanceline / firstClose * 100)).toFixed(2) : Math.abs(100 - (supportline / firstClose * 100)).toFixed(2);

  //Get percentage change of latest price bar to determine if there is a break
  const lastClose = pricedata.support[pricedata.support.length-1].close;
  const lastTime = pricedata.support[pricedata.support.length-1].time;
  const lastCloseAsk = pricedata.support[pricedata.support.length-1].closeAsk;
  const lastCloseBid = pricedata.support[pricedata.support.length-1].closeBid;
  let lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);

  //Determine trend before line ranges
  let trend = firstClose > resistanceline ? 'bearish' : 'bullish';

  //If percentage change is significant, confirm trend (0.50% = 50 points which is quite significant)
  //UPDATE: I changed this to 100points for more certainty of momentum
  if(lastDiff > 1) check1 = true;

  //count how many confirmations/ re-tests
  if(confirmations.support >= confirmationlimit && confirmations.resistance >= confirmationlimit) check2 = true;

  //console.log(pricedata.support[pricedata.support.length-1]);

  //Lastly, check wick data
  let wickdata = await strategy.actions.calcWicks(pricedata);
  linedata.support = supportline;
  linedata.resistance = resistanceline;

  let summary = wickdata.length-1;
  let wds = wickdata[summary];
  let wicktrend = wds.resistance; //trend with strongest resistance for last three price bars
  if(wds.confirmation1 == true && wds.confirmation2 == true) check3 = true;
  if(trend == wicktrend) check4 = true;

  let analysis = {
    'pricedata':pricedata,
    'firstClose': firstClose,
    'firstDiff': firstDiff,
    'lastTime': lastTime,
    'lastClose': lastClose,
    'lastCloseAsk': lastCloseAsk,
    'lastCloseBid': lastCloseBid,
    'lastDiff': lastDiff,
    'wickdata': wickdata,
    'linedata': linedata,
    'trend': trend,
    'wicktrend': wicktrend,
    'wickstrength':wds.strength,
    'confirmations': confirmations,
    'isStrengthGreaterThanLimit': wds.confirmation1,
    'isStrengthIncreasing': wds.confirmation2,
    'isRanging':check0,
    'isLastDiffGreaterThan100Points': check1,
    'isConfirmationsGreaterThanLimit': check2,
    'isWickConfirmationsTrue': check3,
    'isWickTrendSameAsTrend': check4,
    'ticket': {}
  };


console.log(linedata);

analytics.actions.drawChart(pricedata2.support, wickdata, linedata, analysis, rangedata);

}
