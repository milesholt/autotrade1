// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

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

//Require strategy
const strategy = require('./strategies/breakoutStrategy.js');
//Require analytics
const analytics = require('./services/analytics.js');
//Require mailer
const mailer = require('./services/mailer.js');
//Require stream
const stream = require('./services/stream.js');
//Require monitor
const monitor = require('./services/monitor.js');

//Parameters
const rangelimit = 100;
const rangeConfirmationLimit = 10;
let check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false;
let prices = [];
let pricedata = {'support': [], 'resistance': []};
global.rangedata = {'resistance': {}, 'support': {}};
global.linedata = {'support': 0, 'resistance': 0, 'midrange': 0};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
let confirmationlimit = 3;
const epic = 'CS.D.BITCOIN.TODAY.IP';
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
var pricedataDir = path.join(__dirname, 'pricedata.json');
let dealId = '';
let pricedatacount = 0;

//first, lets retreive stored data from file
prices = require(pricedataDir);
console.log(prices);
//Execute main function, looping first
loop();

//Begin Exec function
async function exec(){

  let timestamp  = moment().format('LLL');
  console.log(timestamp);
  let pricedata = {'support': [], 'resistance': []};
  let pricedata2 = {'support': [], 'resistance': []};
  let pricedata3 = {'support': [], 'resistance': []};
  confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
  //confirmations = {'resistance': 0, 'support': 0};
  check0 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false;
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

  //Login
  //console.log('-------Logging in');
  await api.login(true).then(r => {
    //console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

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
      //store back to the file
        fs.writeFile(pricedataDir, JSON.stringify(prices), 'utf8', (e) => {
          if (e) {
            console.log('Could not write price data');
          } else {
            console.log('Price data written to file.');
          }
        });
        var mailOptions = {
          from: 'contact@milesholt.co.uk',
          to: 'miles_holt@hotmail.com',
          subject: 'Downloaded 3 days of prices: ' + moment().format('LLL'),
          text: JSON.stringify(prices)
        };
        mailer.actions.sendMail(mailOptions);
    }).catch(async e => {
      console.log(e);

      if(e.body.errorCode == 'error.security.client-token-invalid'){
        console.log(e);
        console.log('Logging out and clearing tokens...');
        await api.logout(true).then(r => {
          console.log(util.inspect(r,false,null));
        }).catch(e => console.log(e));
        //once logged out and tokens cleared, try again in 2 seconds
        setTimeout(()=>{
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
      if(prices[prices.length-1].snapshotTime !== r.prices[0].snapshotTime){
        console.log('Latest price bar does not exist, adding..');
        prices.push(r.prices[0]);
        pricedatacount++;
        //remove first hour
        console.log('Removing first hour');
        prices.shift();
        //store back to the file
        fs.writeFile(pricedataDir, JSON.stringify(prices), 'utf8', (e) => {
          if (e) {
            console.log('Could not write price data');
          } else {
            console.log('Price data written to file.');
          }
        });
      }else{
        console.log('Latest price bar already exists. Not adding or writing to file');
      }
    }).catch(e => {
      console.log(e);
      loop('Price data not empty. Error retrieving prices latest hour. Possible allowance reached. Waiting an hour. Pricedatacount:' + pricedatacount);
      noError = false;
      return false;
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
  } else {
    return false;
  }

  console.log('-------- Analyst Data:');

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
  let lineDistance = Math.abs(resistanceline - supportline);
  let rangeConfirmations = rangedata.support.prices_idx.length;
  if((lineDistance > 20 && lineDistance < rangelimit) && (resistanceline > supportline)) check0 = true;
  if(rangeConfirmations >= rangeConfirmationLimit) check2 = true;

  // let lineDistance2 = Math.abs(resistanceline2 - supportline2);
  // console.log('lineDistance2: ' + lineDistance2);
  // if((lineDistance2 > 20 && lineDistance2 < 300) && (resistanceline2 > supportline2)) check0_2 = true;

  //Get the percentage change of the first price bar and support/resistance lines (within 36 hour range)
  const beforeRangeFirstClose = pricedata3.support[0].close;
  const firstClose = pricedata2.support[0].close;
  let firstDiff = firstClose > resistanceline ? Math.abs(100 - (resistanceline / firstClose * 100)).toFixed(2) : Math.abs(100 - (supportline / firstClose * 100)).toFixed(2);

  //Get percentage change of latest price bar to determine if there is a break
  const lastClose = pricedata.support[pricedata.support.length-1].close;
  const lastTime = pricedata.support[pricedata.support.length-1].time;
  const lastCloseAsk = pricedata.support[pricedata.support.length-1].closeAsk;
  const lastCloseBid = pricedata.support[pricedata.support.length-1].closeBid;
  let lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);

  //Determine trend before line ranges
  //this could be a possible check7, not introduced yet
  let beforeRangeTrend = beforeRangeFirstClose > firstClose ? 'bearish' : 'bullish';
  //this made when it was working with 3 days of data, but not the same when working with 1 day
  //let trend = firstClose > resistanceline ? 'bearish' : 'bullish';
  const trendDiff = parseFloat(Math.abs(firstClose - lastClose).toFixed(2));
  const trendDiffPerc = Math.abs(100 - (firstClose / lastClose * 100)).toFixed(2);

  let trend = 'ranging';
  if((firstClose > lastClose) && (trendDiff >= rangelimit)) trend = 'bearish';
  if((lastClose > firstClose) && (trendDiff >= rangelimit)) trend = 'bullish';

  //If percentage change is significant, confirm trend (0.50% = 50 points which is quite significant)
  //UPDATE: I changed this to 100points for more certainty of momentum
  if(lastDiff > 0.5) check1 = true;

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
  let movementValue = parseFloat((pricedata.support[pl-1].close - pricedata.support[pl-recentlimit].open).toFixed(2));
  let movementValueDiff = Math.abs(movementValue);

  for(let i = (pl - recentlimit), len = pl; i < len; i++){
    let movement = pricedata.support[i].open > pricedata.support[i].close ? 'down' : 'up';
    if(movement == 'down') { downs++ } else { ups++ };
    recenttrendArr.push(movement);
  }

  recenttrend = 'ranging';
  if((movementValue < 0) && (movementValueDiff > (rangelimit/2))) recenttrend = 'bearish';
  if((movementValue > 0) && (movementValueDiff > (rangelimit/2))) recenttrend = 'bullish';
  if((movementValue < 0) && (downs > ups)) recenttrend = 'bearish';
  if((movementValue > 0) && (ups > downs)) recenttrend = 'bullish';

  //if wicktrend and recenttrend are the same and wicktrend strength is over limit and trend is currently ranging, this would suggest that the market is breaking through range, so set trend as the same
  let isBreakingThroughRange = false;
  if(wicktrend == recenttrend && wds.confirmation1 == true && trend == 'ranging'){
    trend = wicktrend;
    isBreakingThroughRange = true;
  }

  //Possible addition of check5
  //this checks to ensure last price bar is either above support/resistance depending on trend
  //eg. you wouldn't want last price bar to bearish, matching with initial direction but far above resistance line, which would actually suggest it was bullish overall
  if(lastClose < supportline && lastClose < resistanceline) check5 = true;
  if(lastClose > supportline && lastClose > resistanceline) check5 = true;

  if(trend == wicktrend) check4 = true;
  if(trend == recenttrend) check6 = true;
  if(trend == beforeRangeTrend) check7 = true;



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
    'trend': trend,
    'trendDiff': trendDiff,
    'trendDiffPerc': trendDiffPerc + '%',
    'beforeRangeTrend': beforeRangeTrend,
    'wicktrend': wicktrend,
    'wickstrength':wds.strength,
    //'confirmations': confirmations,
    'isWickStrengthGreaterThanLimit': wds.confirmation1,
    //'isWickStrengthIncreasing': wds.confirmation2,
    'rangeConfirmations':rangeConfirmations,
    'recentTrendArr': recenttrendArr,
    'recentTrend': recenttrend,
    'recentUps': ups,
    'recentDowns':downs,
    'recentMovementValue': movementValue,
    'isLastDiffGreaterThan50Points': check1,
    'isRangeAreaGood':check0,
    'isRangeConfirmationsGreaterThanLimit': check2,
    'isWickConfirmationsTrue': check3,
    'islastCloseAboveBelowLines': check5,
    'isWickTrendSameAsTrend': check4,
    'isRecentTrendSameAsTrend': check6,
    'isBeforeRangeSameAsTrend': check7,
    'isBreakingThroughRange': isBreakingThroughRange,
    'ticket': {}
  };

  // const idx = 5;
  // console.log('support:' + analysis.pricedata.support[idx].price);
  // console.log('resistance:' +analysis.pricedata.resistance[idx].price);
  //
  //

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

  analytics.actions.drawChart(pricedata2.support, wickdata, linedata, analysis, rangedata);

  // await api.showOpenPositions().then(async positionsData => {
  //   console.log(util.inspect(positionsData, false, null));
  //   console.log(positionsData.positions.length);
  // });


  //If all checks pass, begin trade
  const checks = [check0,check1,check2,check3,check4,check5,check6,check7];
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

        if(positionsData.positions.length > 0){
          let pos = positionsData.positions[0];
          let stop = pos.position.stopLevel;
          let dealId = pos.position.dealId;
          let catchDiff = Math.abs(pos.position.openLevel - pos.position.stopLevel) / 2;
          let catchPrice = trend === 'bullish' ? pos.position.openLevel - catchDiff : pos.position.openLevel + catchDiff;
          //only trigger if position is 50% close towards loss, then we close
          if((trend === 'bullish' && lastClose <= catchPrice) || (trend === 'bearish' && lastClose >= catchPrice)){
              let closeAnalysis = {
                stop: stop,
                catchDiff: catchDiff,
                catchPrice: catchPrice,
                lastClose: lastClose,
                trend: trend
              }
              console.log('closing position, because loss is 50% towards stop value.');
              console.log('stop value: ' + stop);
              console.log('catchDiff: ' + catchDiff);
              console.log('catchPrice (50% towards stop value): ' + catchPrice);
              console.log('lastClose: '+ lastClose);
              console.log('trend: '+ trend);
              api.closePosition(dealId).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
              var mailOptions = {
                from: 'contact@milesholt.co.uk',
                to: 'miles_holt@hotmail.com',
                subject: 'Closed position due to 50% towards loss: ' + moment().format('LLL') + ' - ' + trend,
                text: JSON.stringify(closeAnalysis)
              };
              mailer.actions.sendMail(mailOptions);
          }
        }

        //stop distance = minimum 1% of lastClose price + fluctuation of 10 as prices are changing
        let stopDistance = Math.round(lastClose * 0.03) + 10;
        console.log('stop distance: ' + stopDistance);


        if(!positionOpen && positionsData.positions.length === 0){
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
          	'stopDistance': stopDistance,
          	'stopLevel': null,
          	'guaranteedStop': false,
          	'timeInForce': 'FILL_OR_KILL',
          	'trailingStop': null,
          	'trailingStopIncrement': null
          };
          analysis.ticket = ticket;
          console.log(analysis);


              //Open a ticket
              api.deal(ticket).then(r => {
                console.log(util.inspect(r, false, null));
                //store dealId for later
                dealId = r.confirms.dealId;
              }).catch(e => console.log(e));

              var mailOptions = {
                from: 'contact@milesholt.co.uk',
                to: 'miles_holt@hotmail.com',
                subject: 'Trade made at: ' + moment().format('LLL') + ' - ' + trend,
                text: JSON.stringify(analysis)
              };
              mailer.actions.sendMail(mailOptions);

              console.log('beginning monitoring..');
              monitor.actions.beginMonitor();

              loop('Checks passed and trade has been made. Will go again in 1 hour.');
              return false;


        } else {
          loop('You are already trading on this epic. Waiting 1 hour.');
          return false;
        };
      }).catch(e => console.log(e));
  } else {
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
