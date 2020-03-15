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

global.confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;
let timestamp  = moment().format('LLL');

//Begin Exec function
actions.exec = async function(epic, prices){

  return new Promise(async (res, rej) => {

    let pricedata = {'support': [], 'resistance': []};
    confirmations = {'resistance': 0, 'support': 0};
    check1 = false, check2 = false, check3 = false;

  console.log('--------BEGIN EXEC BREAKOUT STRATEGY');

  //Retrieve data from prices
  console.log('-------- Prices:');
  prices.forEach((price,idx) =>{
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
  });

  console.log('-------- Analyst Data:');
  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata,'resistance');

  //Get the percentage change of the first price bar and support/resistance lines
  const firstClose = pricedata.support[0].close;
  const firstTime = pricedata.support[0].time;
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
  if(lastDiff > 0.50) check1 = true;

  //count how many confirmations/ re-tests
  if(confirmations.support >= confirmationlimit && confirmations.resistance >= confirmationlimit) check2 = true;

  console.log(pricedata.support[pricedata.support.length-1]);

  //Lastly, check wick data
  let wickdata = await strategy.actions.calcWicks(pricedata);
  let linedata = {'support': supportline, 'resistance': resistanceline};
  let summary = wickdata.length-1;
  let wds = wickdata[summary];
  let wicktrend = wds.resistance; //trend with strongest resistance for last three price bars
  if(wds.confirmation1 == true && wds.confirmation2 == true) check3 = true;

  //Draw analysis on chart
  //analytics.actions.drawChart(pricedata.support, wickdata, linedata);
  let r = {
    'pricedata':pricedata,
    'firstClose': firstClose,
    'firstDiff': firstDiff,
    'firstTime': firstTime,
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
    'isLastDiffGreaterThan50Points': check1,
    'isConfirmationsGreaterThanLimit': check2,
    'isWickConfirmationsTrue': check3,
    'ticket': {}
  };

  // console.log('line data:');
  // console.log(util.inspect(linedata,false,null));
  // console.log('firstClose: '+ firstClose);
  // console.log('firstDiff: '+ firstDiff);
  // console.log('lastClose: '+ lastClose);
  // console.log('lastDiff: '+ lastDiff);
  // console.log('wick data:');
  // console.log(util.inspect(wickdata,false,null));
  // console.log('confirmations:');
  // console.log(util.inspect(confirmations,false,null));
  // console.log('wds.resistance: '+ wds.resistance);
  // console.log('trend: ' +  trend);
  // console.log('wds.confirmation1: '+wds.confirmation1);
  // console.log('wds.confirmation2: '+wds.confirmation2);
  //
  // console.log('check1 - is lastDiff greater than 0.50 points? :' + check1);
  // console.log('check2 - is wick resistance increasing in strength? :' + check2);
  // console.log('check3 - is wick resistance the same as trend and confirmations 1 and 2 are true? :' + check3);

  //If all checks pass, begin trade
  if(check1 && check2 && check3){

      console.log('make trade');

      //check for existing open tickets
      await api.showOpenPositions().then(async positionsData => {
        console.log(util.inspect(positionsData, false, null));
        if(positionsData.positions.length === 0){
          console.log('You have no open position, begin trade.');
          ticket = {
          	'currencyCode': 'GBP',
          	'direction': wicktrend == 'bullish' ? 'BUY' : 'SELL',
          	'epic': epic,
          	'expiry': 'DFB',
          	'size': priceperpoint,
          	'forceOpen': true,
          	'orderType': 'MARKET',
          	'level': null,
          	'limitDistance': 2,
          	'limitLevel': null,
          	'stopDistance': 100, //minimum 1% away (100points)
          	'stopLevel': null,
          	'guaranteedStop': false,
          	'timeInForce': 'FILL_OR_KILL',
          	'trailingStop': null,
          	'trailingStopIncrement': null
          };
          //console.log(ticket);
          r.ticket = ticket;
          //api.deal(ticket).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
          //loop('Checks passed and trade has been made. Will go again in 1 hour.');
        } else {
          //loop('You are already trading on this epic. Waiting 1 hour.');
        }



      }).catch(e => console.log(e));
  } else {
      //loop('Checks not passed. No trade. Waiting 1 hour.');
  }

  res(r);
}).catch(e => {
  rej(e);
});;
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
