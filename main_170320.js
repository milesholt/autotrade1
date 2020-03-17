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

//Parameters
let check0 = false, check1 = false, check2 = false, check3 = false, check4 = false;
let prices = [];
let pricedata = {'support': [], 'resistance': []};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
let confirmationlimit = 3;
const epic = 'CS.D.BITCOIN.TODAY.IP';
const resolution = 'HOUR';
let date1 = moment().add(1, 'days').format('YYYY-MM-DD');
let date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
let today = moment().format('YYYY-MM-DD');
let currenthour = moment().format("HH");
let lasthour = moment().subtract(1, 'hours').format("HH");
var pricedataDir = path.join(__dirname, 'pricedata.json');
let dealId = '';
let pricedatacount = 0;

//first, lets retreive stored data from file
prices = require(pricedataDir);
//Execute main function
exec();

//Begin Exec function
async function exec(){

  let pricedata = {'support': [], 'resistance': []};
  let pricedata2 = {'support': [], 'resistance': []};
  confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
  //confirmations = {'resistance': 0, 'support': 0};
  check0 = false, check1 = false, check2 = false, check3 = false, check4 = false;
  today = moment().format('YYYY-MM-DD');
  date1 = moment().add(1, 'days').format('YYYY-MM-DD');
  date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
  currenthour = moment().format("HH");
  lasthour = moment().subtract(1, 'hours').format("HH");
  let noError = true;
  //3 day date range
  let from = date2+'%20'+'00:00:00';
  let to = date1+'%20'+'00:00:00';

  //last hour date range
  let from2 = today+'%20'+lasthour+':30:00';
  let to2 = today+'%20'+currenthour+':00:00';
  let timestamp  = moment().format('LLL');

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
    }).catch(e => {
      console.log(e);
      console.log(pricedatacount)
      loop('Price data was empty. Error retrieving prices for 3 days. Possible allowance reached. Waiting an hour. Pricedatacount:' + pricedatacount);
      noError = false;
      return false;
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
      prices.push(r.prices[0]);
      pricedatacount++;
      //remove first hour
      console.log('removing first hour');
      prices.shift();
      //store back to the file
        fs.writeFile(pricedataDir, JSON.stringify(prices), 'utf8', (e) => {
          if (e) {
            console.log('Could not write price data');
          } else {
            console.log('Price data written to file.');
          }
        });
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

  let supportline = 0;
  let resistanceline = 0;
  supportline = await strategy.actions.calcResistSupport(pricedata2,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata2,'resistance');
  
  //TO DO: Temporary correction if supportline is greater than resistance - this is due to one line having more pricebars recording a higher level than the other during a certain period.
  if(supportline > resistanceline){
    supportline = resistanceline;
    resistanceline = supportline;
  }
  
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

  //Lastly, check wick data
  let wickdata = await strategy.actions.calcWicks(pricedata);
  let linedata = {'support': supportline, 'resistance': resistanceline};
  let summary = wickdata.length-1;
  let wds = wickdata[summary];
  let wicktrend = wds.resistance;
  if(wds.confirmation1 == true && wds.confirmation2 == true) check3 = true;
  if(trend == wicktrend) check4 = true;

  //Possible addition of check5
  //this checks to ensure last price bar is either above support/resistance depending on trend
  //eg. you wouldn't want last price bar to bearish, matching with initial direction but far above resistance line, which would actually suggest it was bullish overall
  // if(trend == 'bearish' && lastClose < resistanceline) check5 = true;
  // if(trend == 'bullish' && lastClose > supportline) check5 = true;


  //another thing we could check//
  //check open positions if any
  //then analyse wick Data
  //if opposite strength is very strong (suggesting we wont reach limit), close position

  console.log('Last support price bar:');
  console.log(pricedata.support[pricedata.support.length-1]);

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

  analytics.actions.drawChart(pricedata2.support, wickdata, linedata, analysis);

  // await api.showOpenPositions().then(async positionsData => {
  //   console.log(util.inspect(positionsData, false, null));
  //   console.log(positionsData.positions.length);
  // });


  //If all checks pass, begin trade
  if(check0 === true && check1 === true && check2 === true && check3 === true && check4 === true){

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
        let stopDistance = Math.round(lastClose * 0.01) + 10;
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
  setTimeout(() => {
    exec();
  }, 60 * 60 * 1000);

  //executes at every full hour
  // var d = new Date();
  // var min = d.getMinutes();
  // var sec = d.getSeconds();
  // if((min == '00') && (sec == '00')){
  //   exec();
  // } else {
  //   setTimeout(exec,(60*(60-min)+(60-sec))*1000);
  // }

}
