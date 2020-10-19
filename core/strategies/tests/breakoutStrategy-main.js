// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
moment().format();

//Require strategy
const strategy = require('./breakoutStrategy.js');
//Require analytics
const analytics = require('../services/analytics.js');

//Parameters
let actions = {};
let check1 = false, check2 = false, check3 = false;
let prices;
let pricedata = {'support': [], 'resistance': []};
global.confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;
let timestamp  = moment().format('LLL');

//Begin Exec function
actions.exec = async function(epic, prices){

  console.log('--------BEGIN EXEC BREAKOUT STRATEGY');

  //Retrieve data from prices
  console.log('-------- Prices:');
  prices.forEach((price,idx) =>{
    let time =  price.snapshotTime.replace(/\//g, '-');
    let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
    let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
    let midHigh = price.highPrice.ask - (parseInt(price.highPrice.ask - price.highPrice.bid)/2);
    let midLow = price.lowPrice.ask - (parseInt(price.lowPrice.ask - price.lowPrice.bid)/2);
    let supportprice = midOpen <= midClose ? midOpen : midClose;
    let resistprice = midOpen >= midClose ? midOpen : midClose;
    pricedata.support.push({'price': supportprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time});
    pricedata.resistance.push({'price': resistprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time});
  });

  console.log('-------- Analyst Data:');
  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata,'resistance');

  //Get the percentage change of the first price bar and support/resistance lines
  const firstClose = pricedata.support[0].close;
  let firstDiff = firstClose > resistanceline ? Math.abs(100 - (resistanceline / firstClose * 100)).toFixed(2) : Math.abs(100 - (supportline / firstClose * 100)).toFixed(2);

  //Get percentage change of latest price bar to determine if there is a break
  const lastClose = pricedata.support[pricedata.support.length-1].close;
  let lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);

  //Determine trend before line ranges
  let trend = firstClose > resistanceline ? 'bearish' : 'bullish';

  //If percentage change is significant, confirm trend (0.50% = 50 points which is quite significant)
  if(lastDiff > 0.50) check1 = true;

  //count how many confirmations/ re-tests
  if(confirmations.support >= confirmationlimit && confirmations.resistance >= confirmationlimit) check2 = true;

  //Lastly, check wick data
  let wickdata = await strategy.actions.calcWicks(pricedata);
  let linedata = {'support': supportline, 'resistance': resistanceline};
  let summary = wickdata.length-1;
  let wds = wickdata[summary];
  if(wds.resistance == trend && wds.confirmation1 == true && wds.confirmation2 == true) check3 = true;

  //Draw analysis on chart
  analytics.actions.drawChart(pricedata.support, wickdata, linedata);

  //If all checks pass, begin trade
  if(check1 && check2 && check3){

      //check for existing open tickets
      await api.showOpenPositions().then(r => {
        console.log(util.inspect(r, false, null));
        if(r.positions.length === 0){
          console.log('You have no open position, begin trade.');
          ticket = {
          	'currencyCode': 'GBP',
          	'direction': trend == 'bullish' ? 'BUY' : 'SELL',
          	'epic': epic,
          	'expiry': 'DFB',
          	'size': 0.5,
          	'forceOpen': true,
          	'orderType': 'MARKET',
          	'level': null,
          	'limitDistance': 100,
          	'limitLevel': null,
          	'stopDistance': 100,
          	'stopLevel': null,
          	'guaranteedStop': false,
          	'timeInForce': 'FILL_OR_KILL',
          	'trailingStop': null,
          	'trailingStopIncrement': null
          };
          console.log(ticket);
          //api.deal(ticket).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
          //loop('Checks passed and trade has been made. Will go again in 1 hour.');
        } else {
          loop('You are already trading on this epic. Waiting 1 hour.');
        };
      }).catch(e => console.log(e));
  } else {
      loop('Checks not passed. No trade. Waiting 1 hour.');
  }
}

function loop(msg){
  console.log(msg);
  console.log('Time is:' + timestamp);
  //wait for duration then restart function
  setTimeout(() => {
    exec();
  }, 60 * 60 * 1000);
}

module.exports = {
  actions: actions
}
