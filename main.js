
//Requirements
const { range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
// const https = require('https');
const path = require('path');
moment().format();

global.epic = 'CS.D.XLMUSD.TODAY.IP';

//Require strategy
const strategy = require('./strategies/breakoutStrategy.js');
//Require analytics
const analytics = require('./services/analytics.js');
//Require mailer
const mailer = require('./services/mailer.js');
const testmailer = require('./tests/mailer.js');
//Require stream
const stream = require('./services/stream.js');
//Require monitor
const monitor = require('./services/monitor.js');
//Require Github API
const github = require('./services/github.js');

//Parameters
//const rangelimit = 100;
//const tradelimit = 120;
//const linedistancelimit =  20;
const rangelimit = 0.25;
const tradelimit = 0.4;
const linedistancelimit =  0.05;
const rangeConfirmationLimit = 12;
const stopDistanceFluctuation = 0.1;
let check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true;
let prices = [];
let pricedata = {'support': [], 'resistance': []};
global.rangedata = {'resistance': {}, 'support': {}, 'bumps': []};
global.linedata = {'support': 0, 'resistance': 0, 'midrange': 0};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
let confirmationlimit = 3;

const resolution = 'HOUR';
let date1 = moment().add(1, 'days').format('YYYY-MM-DD');
let date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
let today = moment().format('YYYY-MM-DD');
//because the currenthour is still moving, we get the previous hour
//but we get this exactly as the previous hour is logged onto the API
//so it was effectively the currenthour seconds before
//by looping at the exact new hour rather than at a random timeframe
let currenthour = moment().format("HH");
let lasthour = moment().subtract(1, 'hours').format("HH");
//var pricedataDir = path.join(__dirname, 'pricedata.json');
//var beforeRangeDir = path.join(__dirname, 'beforerangedata.json');
var pricedataDir = 'pricedata.json';
var beforeRangeDir = 'beforerangedata.json';
let dealId = '';
let pricedatacount = 0;
let previousTrend = 'ranging';
let lastBeforeRangeTrendMovement = '';
let lastBeforeRangeTrendMovementClose = 0;
let lastBeforeRangeTrendMovementTime = '';
let tradedbefore = false;
let beforeRangeData;


//first, lets retreive stored data from file
//prices = require(pricedataDir);
//grab any written beforerange data
//beforeRangeData = require(beforeRangeDir);

run();

async function run(){
  //Login and check for open positions first
  await init();
  //Then execute main function, looping initially
  loop();
}

async function init(){
  //Login
  //console.log('-------Logging in');
  await api.login(true).then(r => {
    //console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Check for open positions
  await api.showOpenPositions().then(async positionsData => {
        console.log('------checking for open positions');
        console.log(util.inspect(positionsData, false, null));
        if(positionsData.positions.length > 0){
          console.log('position found beginning monitoring.');
          monitor.actions.beginMonitor();
        }
  }).catch(e => console.log('catch error: showOpenPositions: ' + e));
}

//Begin Exec function
async function exec(){

  let timestamp  = moment().format('LLL');
  console.log(timestamp);
  let pricedata = {'support': [], 'resistance': []};
  let pricedata2 = {'support': [], 'resistance': []};
  let pricedata3 = {'support': [], 'resistance': []};
  confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
  //confirmations = {'resistance': 0, 'support': 0};
  check0 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true;
  today = moment().format('YYYY-MM-DD');
  date1 = moment().add(1, 'days').format('YYYY-MM-DD');
  date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
  currenthour = moment().format("HH");
  lasthour = moment().subtract(1, 'hours').format("HH");
  let noError = true;
  //3 day date range
  let from = date2+'%20'+'00:00:00';
  let to = today+'%20'+currenthour+':00:00';

  //last hour date range
  let from2 = today+'%20'+lasthour+':30:00';
  let to2 = today+'%20'+currenthour+':00:00';

  console.log('currenthour: ' + currenthour);
  console.log('lasthour: ' + lasthour);
  console.log('--------BEGIN EXEC: ' + timestamp );
  console.log('--------BEGIN EXEC AUTO TRADE');

  //get stored price and beforeRangeData from GitHub
  github.shas = [];
  prices = await github.actions.getFile(pricedataDir);
  let pricesSha = github.sha;
  beforeRangeData = await github.actions.getFile(beforeRangeDir);
  let beforeRangeSha = github.sha;

  console.log('priceSha: ' + pricesSha);
  console.log('beforeRangeSha: ' + beforeRangeSha);

  console.log('prices: '  + prices.length);
  console.log('written beforerange data:');
  console.log(beforeRangeData);

  //set beforeRangeData
  if(beforeRangeData.lastBeforeRangeTrendMovement !== ''){
    console.log('using stored beforerangedata');
    lastBeforeRangeTrendMovement = beforeRangeData.lastBeforeRangeTrendMovement;
    lastBeforeRangeTrendMovementClose = beforeRangeData.lastBeforeRangeTrendMovementClose;
    lastBeforeRangeTrendMovementTime = beforeRangeData.lastBeforeRangeTrendMovementTime;
  }

  //Retrieve data from epic
  console.log('-------Retrieving historic pricing data for epic');

  //if data from file is empty, load last 3 days
  console.log('Price length: ' + prices.length);
  if(prices.length == 0){
    console.log('Price data is empty, storing data for last 3 days.');
    console.log(from);
    console.log(to);
    await api.histPrc(epic, resolution, from, to).then(r => {
      prices = r.prices;
      pricedatacount = prices.length;

        github.actions.updateFile(prices,pricedataDir);
        //store back to the file
        /*fs.writeFile(pricedataDir, JSON.stringify(prices), 'utf8', (e) => {
          if (e) {
            console.log('Could not write price data');
          } else {
            console.log('Price data written to file.');
          }
        });*/

        var mailOptions = {
          from: 'contact@milesholt.co.uk',
          to: 'miles_holt@hotmail.com',
          subject: 'Downloaded 3 days of prices: ' + moment().format('LLL'),
          text: JSON.stringify(prices)
        };
        mailer.actions.sendMail(mailOptions);
    }).catch(async e => {

      console.log('----ERROR:');
      console.log('e.body.errorCode:' + e.body.errorCode);

      if(e.body.errorCode == 'error.security.client-token-invalid'){
        //console.log(e);
        console.log('Logging out and clearing tokens...');
        await api.logout(true).then(r => {
          console.log(util.inspect(r,false,null));
        }).catch(e => console.log(e));
        //once logged out and tokens cleared, try again in 2 seconds
        setTimeout(async()=>{
          //log back in and go again..
          await init();
          exec();
        },2000);

      } else {
        console.log(pricedatacount);
        loop('Price data was empty. Error retrieving prices for 3 days. Possible allowance reached. Waiting an hour. Pricedatacount:' + pricedatacount);
        noError = false;
        return false;
      }

    });
  } else {
    console.log('Retrieving last hour and appending to price data.');

    //use real-time streaming to get latest hour
    // await stream.actions.startStream();
    // await stream.actions.readStream(true).then(r => {
    //   console.log('Stream response:');
    //   console.log(r);
    //   if(Object.keys(r).length){
    //     prices.push(r);
    //     //store back to the file
    //       fs.writeFile(pricedataDir, JSON.stringify(prices), 'utf8', (e) => {
    //         if (e) {
    //           console.log('Could not write price data');
    //         } else {
    //           console.log('Price data written to file.');
    //         }
    //       });
    //     console.log('Collected price data, closing stream.');
    //     stream.actions.endStream();
    //   }
    // });

    await api.histPrc(epic, resolution, from2, to2).then(r => {
      console.log(r);
      //prices.push.apply(prices, r.prices);
      //Check price bar doesn't already exist on pricedata
      if(r.prices.length){
          if(prices[prices.length-1].snapshotTime !== r.prices[0].snapshotTime){
            console.log('Latest price bar does not exist, adding..');
            prices.push(r.prices[0]);
            pricedatacount++;
            //remove first hour
            console.log('Removing first hour');
            prices.shift();
            //store back to the file

            github.actions.updateFile(prices,pricedataDir);
            /*
            fs.writeFile(pricedataDir, JSON.stringify(prices), 'utf8', (e) => {
              if (e) {
                console.log('Could not write price data');
              } else {
                console.log('Price data written to file.');
              }
            });
            */
          }else{
            console.log('Latest price bar already exists. Not adding or writing to file');
          }
      }else{
        console.log('No prices recorded');
      }
    }).catch(async e => {
      console.log(e);

       if(e.body.errorCode == 'error.security.client-token-invalid'){
        //console.log(e);
        console.log('Logging out and clearing tokens...');
        await api.logout(true).then(r => {
          console.log(util.inspect(r,false,null));
        }).catch(e => console.log(e));
        //once logged out and tokens cleared, try again in 2 seconds
        setTimeout(async()=>{
          //log back in and go again..
          await init();
          exec();
        },2000);

      } else {
        console.log(pricedatacount);
        loop('Price data not empty. Error retrieving prices latest hour. Possible allowance reached. Waiting an hour. Pricedatacount:' + pricedatacount);
        noError = false;
        return false;
      }

    });

  }


if(noError){

  //Retrieve data from prices
  if(prices.length > 0){
    console.log('-------- Prices:');
    //console.log(prices);
    prices.forEach((price,idx) =>{
      if(price !== null){
        let time =  price.snapshotTime.replace(/\//g, '-');
       /*
        let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
        let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
        let midHigh = price.highPrice.ask - (parseInt(price.highPrice.ask - price.highPrice.bid)/2);
        let midLow = price.lowPrice.ask - (parseInt(price.lowPrice.ask - price.lowPrice.bid)/2);*/

        let midOpen = parseFloat(parseFloat(price.openPrice.ask - ((price.openPrice.ask - price.openPrice.bid)/2) ).toFixed(2));
        let midClose = parseFloat(parseFloat(price.closePrice.ask - ((price.closePrice.ask - price.closePrice.bid)/2) ).toFixed(2));
        let midHigh = parseFloat(parseFloat(price.highPrice.ask - ((price.highPrice.ask - price.highPrice.bid)/2) ).toFixed(2));
        let midLow = parseFloat(parseFloat(price.lowPrice.ask - ((price.lowPrice.ask - price.lowPrice.bid)/2) ).toFixed(2));

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
  } else {
    return false;
  }

  console.log('-------- Analyst Data:');

  console.log(pricedata.support[0]);

  //UPDATE: Instead of using 3 days of data to create lines, we only use last 24 hours
  let start = (pricedata.support.length - 25);
  pricedata2.support = pricedata.support.filter((price,i) => i > start);
  pricedata2.resistance = pricedata.resistance.filter((price,i) => i > start);

  //pricedata3 does 36 hours
  let start2 = (pricedata.support.length - 37);
  pricedata3.support = pricedata.support.filter((price,i) => i > start2);
  pricedata3.resistance = pricedata.resistance.filter((price,i) => i > start2);

  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata2,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata2,'resistance');

  //verify horizontal lines meet conditions
  //must have 20 points minimum distance from each other
  //if are certain number of points maximum distance apart, then chart is not considered ranging
  //rangelimit is currently considered 100 points
  let lineDistance = parseFloat(Math.abs(resistanceline - supportline).toFixed(2));
  let rangeConfirmations = rangedata.support.prices_idx.length;
  if((lineDistance >= linedistancelimit && lineDistance <= rangelimit) && (resistanceline > supportline)) check0 = true;
  if(rangeConfirmations >= rangeConfirmationLimit) check2 = true;

  // let lineDistance2 = Math.abs(resistanceline2 - supportline2);
  // console.log('lineDistance2: ' + lineDistance2);
  // if((lineDistance2 > 20 && lineDistance2 < 300) && (resistanceline2 > supportline2)) check0_2 = true;

  //Get the percentage change of the first price bar and support/resistance lines (within 36 hour range)
  const beforeRangeFirstClose = pricedata3.support[0].close;
  const firstClose = pricedata2.support[0].close;
  let firstDiff = firstClose > resistanceline ? Math.abs(100 - (resistanceline / firstClose * 100)).toFixed(2) : Math.abs(100 - (supportline / firstClose * 100)).toFixed(2);

  //Get percentage change of latest price bar to determine if there is a break
  const lastOpen = pricedata.support[pricedata.support.length-1].open;
  const lastClose = pricedata.support[pricedata.support.length-1].close;
  const lastTime = pricedata.support[pricedata.support.length-1].time;
  const lastCloseAsk = pricedata.support[pricedata.support.length-1].closeAsk;
  const lastCloseBid = pricedata.support[pricedata.support.length-1].closeBid;
  let lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);



  //this made when it was working with 3 days of data, but not the same when working with 1 day
  //let trend = firstClose > resistanceline ? 'bearish' : 'bullish';
  const trendDiff = parseFloat(Math.abs(firstClose - lastClose).toFixed(2));
  const trendDiffPerc = Math.abs(100 - (firstClose / lastClose * 100)).toFixed(2);

  let trend = 'ranging';

  //if prices have moved and over significant distance (range area limit)
  if((firstClose > lastClose) && (trendDiff >= rangelimit)) trend = 'bearish';
  if((lastClose > firstClose) && (trendDiff >= rangelimit)) trend = 'bullish';

  //Determine trend before line ranges
  //This determines trend between price bar at 36 hours to lastClose
  let beforeRangeTrend = 'ranging';
  let beforeRangeFirstCloseData = pricedata3.support[0];
  const beforeRangeTrendDiff = parseFloat(Math.abs(beforeRangeFirstClose - lastClose).toFixed(2));
  if((beforeRangeFirstClose > resistanceline) && (beforeRangeTrendDiff >= (rangelimit/2))) beforeRangeTrend = 'bearish';
  if((beforeRangeFirstClose < supportline) && (beforeRangeTrendDiff >= (rangelimit/2))) beforeRangeTrend = 'bullish';
  if(beforeRangeTrend !== 'ranging'){
    lastBeforeRangeTrendMovement = beforeRangeTrend;
    lastBeforeRangeTrendMovementClose = beforeRangeFirstClose;
    lastBeforeRangeTrendMovementTime = beforeRangeFirstCloseData.time;

    let beforeRangeData = {
      'lastBeforeRangeTrendMovement': lastBeforeRangeTrendMovement,
      'lastBeforeRangeTrendMovementClose' : lastBeforeRangeTrendMovementClose,
      'lastBeforeRangeTrendMovementTime' : lastBeforeRangeTrendMovementTime
    }

    setTimeout(()=>{
      console.log('updating beforeRangeData file after 10 seconds');
      github.actions.updateFile(beforeRangeData,beforeRangeDir);
    },10000);




     // fs.writeFile(beforeRangeDir, JSON.stringify(beforeRangeData), 'utf8', (e) => {
     //      if (e) {
     //        console.log('Could not before range data');
     //      } else {
     //        console.log('Before range data written to file.');
     //      }
     //  });
  }

  //If percentage change is significant, confirm trend (0.20% = 20 points)
  //It needs to be at least 20 points past the line to count as momentum
  if(lastDiff > 0.2) check1 = true;

  //count how many confirmations/ re-tests
  //if(confirmations.support >= confirmationlimit && confirmations.resistance >= confirmationlimit) check2 = true;
  //overiding confirmations as this is no longer valid and needs to be redone

  //Lastly, check wick data
  let wickdata = await strategy.actions.calcWicks(pricedata);
  linedata.support = supportline;
  linedata.resistance = resistanceline;

  let summary = wickdata.length-1;
  let wds = wickdata[summary];
  let wicktrend = wds.resistance;
  if(wds.confirmation1 == true) check3 = true;

  //another thing we could check//
  //check open positions if any
  //then analyse wick Data
  //if opposite strength is very strong (suggesting we wont reach limit), close position

  console.log('Last support price bar:');
  console.log(pricedata.support[pricedata.support.length-1]);

  //loop through recent price bars and determine movement
  let recentlimit = 4;
  let recenttrendArr = [];
  let recenttrend = '';
  let ups = 0;
  let downs = 0;
  let pl = pricedata.support.length;
  let movementValue = parseFloat((pricedata.support[pl-1].close - pricedata.support[pl-recentlimit].close).toFixed(2));
  let movementValueDiff = Math.abs(movementValue);
  let movementValueDiffPerc = Math.abs(movementValue / pricedata.support[pl-1].close * 100).toFixed(2);

  for(let i = (pl - recentlimit), len = pl; i < len; i++){
    let movement = pricedata.support[i].open > pricedata.support[i].close ? 'down' : 'up';
    if(movement == 'down') { downs++ } else { ups++ };
    recenttrendArr.push(movement);
  }

  recenttrend = 'ranging';
  if((movementValue < 0) && (movementValueDiff >= parseFloat((rangelimit/2).toFixed(2)) )) recenttrend = 'bearish';
  if((movementValue > 0) && (movementValueDiff >= parseFloat((rangelimit/2).toFixed(2)) )) recenttrend = 'bullish';
  if((movementValue < 0) && (downs > ups)) recenttrend = 'bearish';
  if((movementValue > 0) && (ups > downs)) recenttrend = 'bullish';

  //if wicktrend and recenttrend are the same and wicktrend strength is over limit and trend is currently ranging, this would suggest that the market is breaking through range, so set trend as the same
  let isRecentTrendBreaking = false;
  let currenttrend = trend; //store a copy of trend before (if) changing it for analysis
  if(recenttrend !== 'ranging' && (movementValueDiff >= (rangelimit/2)) && trend == 'ranging'){
    trend = recenttrend;
    isRecentTrendBreaking = true;
  }

  //Possible addition of check5
  //this checks to ensure last price bar is either above support/resistance depending on trend
  //eg. you wouldn't want last price bar to bearish, matching with initial direction but far above resistance line, which would actually suggest it was bullish overall
  if(lastClose < supportline && lastClose < resistanceline) check5 = true;
  if(lastClose > supportline && lastClose > resistanceline) check5 = true;

  //set previous trend for next loop
  //if previous trend was ranging and latest trend isn't, this suggests trend has broken out of range
  //rangedata.support.prices_idx;
  let recentrange = [];
  let recentrangelimit =  5;
  rangedata.support.prices_idx.forEach(pid => {
    if(pid > 12) recentrange.push(pid);
  });

  //if number of range confirmations is over limit
  //if price bar is within horizontal lines
  //if range confirmations are recent and over count limit
  //then trend and recenttrend should overidden to be ranging
  if(check5 == false && check2 == true && recentrange.length >= recentrangelimit){
    trend = 'ranging';
    recenttrend = 'ranging';
    isRecentTrendBreaking = false;
  }

  if(trend == wicktrend) check4 = true;
  if(trend == recenttrend) check6 = true;
  if(trend == beforeRangeTrend) check7 = true;
  if((previousTrend == 'ranging' || (check2 == true && recentrange.length >= recentrangelimit)) && (recentrange.indexOf(22) !== -1 || recentrange.indexOf(23) !== -1) && trend !== 'ranging'){
    check8 = true;
  }

  //trade threshold check - If the price goes in the right direction, but way beyond expected area of profit (a sudden significant ride or drop). if this happens, it can take longer to recover and usually moves in the opposite direction afterward
  if(trend == 'bullish' && (Math.abs(lastClose - resistanceline) >= tradelimit)) check9 = false;
  if(trend == 'bearish' && (Math.abs(lastClose - supportline) >= tradelimit)) check9 = false;
  if(Math.abs(lastClose - lastOpen) >= tradelimit) check9 = false;

  //loop through times and ensure no hours / data is missing (on Fridays for example, the market closes, there is a gap in hours which affects the data)
  let time = moment(pricedata2.support[0].time);
  let isHoursCorrect = true;
  let totalMissingHours = 0;
  const missingHoursLimit = 3;
  let start = 0, end = 0, diff = 0, d = 0;

  
  
  pricedata2.support.forEach((price,index) => {
    //skip the first hour
    if(index !== 0){
      
      /*
      let ntime = moment(price.time);
      let diff = Math.abs(time.diff(ntime, 'minutes'));
      console.log('old time: ' + moment(time).format('HH') + ' new time: ' + moment(ntime).format('HH') + ' diff: ' + diff);
      if(diff !== 60) totalMissingHours += diff / 60;*/
      
      start = time;
      end = moment(price.time);
      diff = end.diff(start, "hours") - 1; //remove by one because we only want the number of hours in between
      d = diff == -1 ? 0 : diff;
      totalMissingHours += diff;
      
      time = moment(price.time);
    }
  });
  //if the number of hours is greater than limit, set data as missing. Exceptions if for example, only one or two hours is missing, this is fine.
  if(totalMissingHours >= missingHoursLimit) isHoursCorrect = false;
  check10 = isHoursCorrect;

  //if a number of checks are passed, we overide beforeRangeTrend and pass only if lastBeforeRangeMovement is also the same as trend
  //lastBeforeRangeMovement only holds 'bullish' or 'bearish' when last recorded as beforeRangeTrend
  //this is to capture longer ranging staircase patterns, where the beforeRangeTrend might be outside number of hours we set as parameter
  let beforeRangeOveridden = false;
  const lastBeforeRangeTrendMovementDiff = parseFloat(Math.abs(lastBeforeRangeTrendMovementClose - lastClose).toFixed(2));
  if(beforeRangeTrend == 'ranging' && trend == lastBeforeRangeTrendMovement && check8 == true && check5 == true && lastBeforeRangeTrendMovementDiff >= (rangelimit/2)) {
    check7 = true;
    beforeRangeOveridden = true;
  }

  //this checks that if some price bars are ignored within the range area, and they are greater or smaller than the beforerangefirstclose, then
  //this suggests a bump / hill formation within the range area and not a staircase formation
  //let bf = beforeRangeOveridden ? lastBeforeRangeTrendMovementClose : beforeRangeFirstClose;
  //let bumps = [];
  let rd = rangedata.support.prices_idx;
  rangedata.bumps = [];


  pricedata2.support.forEach((price,idx) => {
    //if(trend == 'bearish') if(price.close >= resistanceline && rangedata.support.prices_idx.indexOf(idx) !== -1) bumps.push({ 'idx' : idx, 'close' : price.close });
    //if(trend == 'bullish') if(price.close <= supportline && rangedata.support.prices_idx.indexOf(idx) !== -1) bumps.push({ 'idx' : idx, 'close' : price.close });
    //if((price.close >= resistanceline || price.close <= supportline) && rangedata.support.prices_idx.indexOf(idx) !== -1) rangedata.bumps.push({ 'idx' : idx, 'close' : price.close });
    if((price.close >= resistanceline || price.close <= supportline) && rd.indexOf(idx) === -1 && (idx >= rd[0] && idx <= rd[rd.length-1])) rangedata.bumps.push({ 'idx' : idx, 'close' : price.close });

  });

  let bidx = 0;
  let bumpgroupcount = 0;
  const bumpgrouplimit = 5;

  //this makes sure that the bumps are together as a group (not scattered indexes), and must exceed a certain amount
  rangedata.bumps.forEach(bump => {
    if(bump.idx == (bidx+1)) bumpgroupcount++;
    bidx = bump.idx;
  });

  if(rangedata.bumps.length > 0 && bumpgroupcount >= bumpgrouplimit) check11 = false;


  if(tradedbefore) check12 = false;


  let analysis = {
    'pricedata':pricedata,
    'firstClose': firstClose,
    'beforeRangeFirstClose': beforeRangeFirstClose,
    'firstDiff': firstDiff,
    'lastTime': lastTime,
    'lastClose': lastClose,
    'lastCloseAsk': lastCloseAsk,
    'lastCloseBid': lastCloseBid,
    'lastDiff': lastDiff,
    'wickdata': wickdata,
    'linedata': linedata,
    'lineDistance': lineDistance,
    'previousTrend' : previousTrend,
    'trend': currenttrend,
    'trendDiff': trendDiff,
    'trendDiffPerc': trendDiffPerc + '%',
    'beforeRangeTrend': beforeRangeTrend,
    'beforeRangeFirstCloseData' : beforeRangeFirstCloseData,
    'beforeRangeTrendDiff': beforeRangeTrendDiff,
    'wicktrend': wicktrend,
    'wickstrength':wds.strength,
    //'confirmations': confirmations,
    'isWickStrengthGreaterThanLimit': wds.confirmation1,
    //'isWickStrengthIncreasing': wds.confirmation2,
    'rangedata_indexes': rangedata.support.prices_idx,
    'recentrange': recentrange,
    'rangeConfirmations':rangeConfirmations,
    'recentTrendArr': recenttrendArr,
    'recentTrend': recenttrend,
    'recentUps': ups,
    'recentDowns':downs,
    'recentMovementValue': movementValue,
    'recentMovementValueDiffPerc': movementValueDiffPerc + '%',
    'isLastDiffGreaterThan20Points': check1,
    'isRangeAreaGood':check0,
    'isRangeConfirmationsGreaterThanLimit': check2,
    'isRecentRangeOverLimit': recentrange.length >= recentrangelimit,
    'recentRangeIndex22': recentrange.indexOf(22),
    'recentRangeIndex23': recentrange.indexOf(23),
    'updatedtrend': trend,
    //'isWickConfirmationsTrue': check3,
    'islastCloseAboveBelowLines': check5,
    //'isWickTrendSameAsTrend': check4,
    'isRecentTrendSameAsTrend': check6,
    'isBeforeRangeSameAsTrend': check7,
    'isRecentTrendBreaking' : isRecentTrendBreaking,
    'isBreakingThroughRange': check8,
    'isWithinTradeThreshold': check9,
    'isHoursCorrect': check10,
    'totalMissingHours': totalMissingHours,
    'noBumpInRange': check11,
    'bumps': rangedata.bumps,
    'bumpgroupcount': bumpgroupcount,
    'notTradedBefore': check12,
    'beforeRangeOveridden': beforeRangeOveridden,
    'lastBeforeRangeTrendMovement': lastBeforeRangeTrendMovement,
    'lastBeforeRangeTrendMovementClose': lastBeforeRangeTrendMovementClose,
    'lastBeforeRangeTrendMovementTime': lastBeforeRangeTrendMovementTime,
    'lastBeforeRangeTrendMovementDiff': lastBeforeRangeTrendMovementDiff,
    'ticket': {}
  };

  // const idx = 5;
  // console.log('support:' + analysis.pricedata.support[idx].price);
  // console.log('resistance:' +analysis.pricedata.resistance[idx].price);
  //
  //

  //set previous trend after everything else (using currenttrend to catch 'ranging' otherwise isBreakingThroughRange is false)
  previousTrend = currenttrend;

  console.log(analysis);


  //Draw analysis on chart

  //For testing purposes
  // var pricehistoryDir = path.join(__dirname, 'pricehistory.json');
  // let testprices = require(pricehistoryDir);
  // let testdata = {'support': [], 'resistance': []};
  // let data = [];
  // let set = [];
  // let day = 0;
  // let days = 0;
  // testprices.forEach((price,i) => {
  //   let time =  price.snapshotTime.replace(/\//g, '-');
  //   let timeformat = moment(time).format('YYYY-MM-DD').split('-');
  //   let day2 = timeformat[2];
  //   if(i==0) day = day2;
  //   if(day2 !== day){
  //     days++;
  //     day = day2;
  //   }
  //   set.push(price);
  //   if(days == 3){
  //     data.push(set);
  //     set = [];
  //     days = 0;
  //   }
  // });
  // data[0].forEach((price,idx) =>{
  //   let time =  price.snapshotTime.replace(/\//g, '-');
  //   let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
  //   let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
  //   let midHigh = price.highPrice.ask - (parseInt(price.highPrice.ask - price.highPrice.bid)/2);
  //   let midLow = price.lowPrice.ask - (parseInt(price.lowPrice.ask - price.lowPrice.bid)/2);
  //   let askClose = price.closePrice.ask;
  //   let bidClose = price.closePrice.bid;
  //   let supportprice = midOpen <= midClose ? midOpen : midClose;
  //   let resistprice = midOpen >= midClose ? midOpen : midClose;
  //   testdata.support.push({'price': supportprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
  //   testdata.resistance.push({'price': resistprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
  // });
  // console.log(testdata);
  // let supportlinet = await strategy.actions.calcResistSupport(testdata,'support');
  // let resistancelinet = await strategy.actions.calcResistSupport(testdata,'resistance');
  // let wickdatat = await strategy.actions.calcWicks(testdata);
  // let linedatat = {'support': supportlinet, 'resistance': resistancelinet};
  // analytics.actions.drawChart(testdata.support, wickdatat, linedatat);

  //console.log(pricedata2.support);

  analytics.actions.drawChart(pricedata3.support, wickdata, linedata, analysis, rangedata);

  // await api.showOpenPositions().then(async positionsData => {
  //   console.log(util.inspect(positionsData, false, null));
  //   console.log(positionsData.positions.length);
  // });




  //If all checks pass, begin trade
  const checks = [check0,check1,check2,check5,check6,check7,check8,check9,check10,check11,check12];
  if(checks.indexOf(false) == -1){

      //check if we already have a position
      let positionOpen = false;
      if(dealId !== ''){
        await api.getPosition(String(dealId)).then(async positionData => {
          console.log('Found position: ' + dealId);
          console.log(positionData);
          if(positionData.market.marketStatus !== 'CLOSED'){
            positionOpen = true;
          }
        }).catch(async e => {
          console.log('API might have failed to find open position, going again..');
          console.log(e);
          //API might fail to find position, go again
          //check history for position
          //if still no position recorded, end exec and log issue
          await api.acctTransaction('ALL_DEAL', date2, date1, 20, 1).then(r => {
            r.transactions.forEach(transaction => {
              if(dealId === transaction.reference){
                console.log('Deal found in transaction history. Clear position and continue with trade.');
                dealId = '';
              }
            });
          }).catch(e => {
            console.log('Problem getting transaction history. Ending exec');
            console.log(e);
            return false;
          });
        });
      }


      //check for existing open tickets
      await api.showOpenPositions().then(async positionsData => {
        console.log(util.inspect(positionsData, false, null));

        //NEW LOGIC
        /*

        The logic is as follows:
        When BUYING the openprice is the askprice, but it closes on bidprice, and vice versa for SELL
        With this in mind, we need to account for the difference between these two prices and adjust it with the distance

        The following calculations do the following:

        get a percentage of ask/bid price depending on direction
        we then get difference between ask and bid prices
        for limit - we subtract the difference
        for stop - we add the difference

        */

        //When setting distances, if we are buying, we need to use the bid close price, and selling, use the ask close price
        let cp = trend == 'bullish' ? lastCloseBid : lastCloseAsk;
        //limit distance = 1.5% of lastClose price
        let limitDistance = parseFloat((cp * 0.015).toFixed(2));
        //stop distance = 5% of lastClose price + fluctuation of 10 as prices are changing
        let stopDistance = parseFloat(((cp * 0.05) + stopDistanceFluctuation).toFixed(2));

        //These calculations arrive to the same values as the logic above
        //It essentially does everything in one line, calculating the difference while adding/substracting the distance depending on whether it is limit or stop

        let nl = Math.abs(lastCloseAsk - (lastCloseBid + limitDistance));
        let ns = Math.abs(lastCloseAsk - (lastCloseBid - stopDistance));


        console.log('trend is: ' + trend + ' so going by: ' + (trend == "bullish" ? 'bid price' : 'ask price') +  ' cp: ' + cp);
        console.log('stopDistance: ' + stopDistance);
        console.log('limitDistance: ' + limitDistance);
        console.log('new limit distance:' + nl);
        console.log('new stop distance:' + ns);

        //console.log('stopDistance2: '+ stopDistance2);
        //let stopDistance = 0.5;
        let ticketError = false;

        if(!positionOpen && positionsData.positions.length === 0){
          console.log('You have no open position, begin trade.');
          ticket = {
          	'currencyCode': 'GBP',
          	'direction': trend == 'bullish' ? 'BUY' : 'SELL',
          	'epic': epic,
          	'expiry': 'DFB',
          	'size': 50,
          	'forceOpen': true,
          	'orderType': 'MARKET',
          	'level': null,
          	'limitDistance':nl,
          	'limitLevel': null,
          	'stopDistance': ns,
          	'stopLevel': null,
          	'guaranteedStop': false,
          	'timeInForce': 'FILL_OR_KILL',
          	'trailingStop': null,
          	'trailingStopIncrement': null
          };
          analysis.ticket = ticket;
          console.log(analysis);

              //Open a ticket
              await api.deal(ticket).then(async r => {
                console.log(util.inspect(r, false, null));
                let ref = r.positions.dealReference;

                if(!r.confirms.dealId){


                  console.log('Error: ' + r.confirms.errorCode);

                  //get status of position if error
                  await api.confirmPosition(ref).then(async rc => {
                    console.log(util.inspect(rc, false, null));
                    //check again as sometimes there's an error - not found - if it's still being processed
                    ticketError = true;
                    if(rc.dealStatus == 'ACCEPTED' && rc.reason == 'SUCCESS' && rc.status == 'OPEN'){
                      ticketError = false;
                      dealId = r.confirms.dealId;
                    }
                  });

                  if(ticketError){
                    //send email
                    var mailOptions = {
                      from: 'contact@milesholt.co.uk',
                      to: 'miles_holt@hotmail.com',
                      subject: 'Error - Trade NOT made at: ' + moment().format('LLL') + ' - ' + trend,
                      text: JSON.stringify(analysis)
                    };
                    mailer.actions.sendMail(mailOptions);
                    testmailer.actions.testMail();
                  }


                } else {

                  //there can be a deal id but also an error, so check for errors again
                  await api.confirmPosition(ref).then(async rc => {
                    console.log(util.inspect(rc, false, null));
                    //check again as sometimes there's an error - not found - if it's still being processed
                    ticketError = true;
                    if(rc.dealStatus == 'ACCEPTED' && rc.reason == 'SUCCESS' && rc.status == 'OPEN'){
                      ticketError = false;
                      dealId = r.confirms.dealId;
                    } else if(rc.dealStatus == 'REJECTED'){

                          console.log('Deal rejected: ' + r.confirms.reason);
                          var mailOptions = {
                            from: 'contact@milesholt.co.uk',
                            to: 'miles_holt@hotmail.com',
                            subject: 'Error - Trade NOT made at: ' + moment().format('LLL') + ' - ' + trend,
                            text: JSON.stringify(analysis)
                          };
                          mailer.actions.sendMail(mailOptions);
                          testmailer.actions.testMail();
                     }
                  });
                }


              }).catch(e => {
                console.log('---------Error creating ticket:');
                console.log(e);
                ticketError = true;
              });

              if(ticketError == false){
                  var mailOptions = {
                    from: 'contact@milesholt.co.uk',
                    to: 'miles_holt@hotmail.com',
                    subject: 'Trade made at: ' + moment().format('LLL') + ' - ' + trend,
                    text: JSON.stringify(analysis)
                  };
                  mailer.actions.sendMail(mailOptions);
                  testmailer.actions.testMail();

                  console.log('beginning monitoring..');
                  monitor.actions.beginMonitor();

                  tradedbefore = true;
                  loop('Checks passed and trade has been made. Will go again in 1 hour.');
                  return false;
               } else {
                  loop('Tried to make a trade, but it failed. Will go again in 1 hour.');
                  return false;
               }

        } else {

          loop('You are already trading on this epic. Waiting 1 hour.');
          return false;
        };
      }).catch(e => console.log(e));
  } else {
      tradedbefore = false;
      loop('Checks not passed. No trade. Waiting 1 hour.');
      return false;
  }
}//if continue
}

function loop(msg){
  console.log(msg);
  let timestamp  = moment().format('LLL');
  console.log('Time is:' + timestamp);
  //wait for duration then restart function
  // setTimeout(() => {
  //   exec();
  // }, 60 * 60 * 1000);

  //executes at every full hour, one minute before the new hour begins
  // var d = new Date();
  // //mark the hour
  // var hour = d.getHours();
  // var min = d.getMinutes();
  // var sec = d.getSeconds();
  // setTimeout(exec,(60*(59-min)+(60-sec))*1000);

  //executes at every full hour and 10 seconds offset
  //to collect the previous hour
  var d = new Date();
  var min = d.getMinutes();
  var sec = d.getSeconds();
  if((min == '00') && (sec == '10')){
    let timestamp  = moment().format('LLL');
    console.log('Beginning exec. Should be 10 seconds after hour. Time is:' + timestamp);
    exec();
  } else {
    setTimeout(exec,(60*(60-min)+(70-sec))*1000);
  }

}


function deepCopy(origObj){
        var newObj = origObj;
         if (origObj && typeof origObj === "object") {
             newObj = Object.prototype.toString.call(origObj) === "[object Array]" ? [] : {};
             for (var i in origObj) {
                 newObj[i] = this.deepCopy(origObj[i]);
             }
         }
         return newObj;
}
