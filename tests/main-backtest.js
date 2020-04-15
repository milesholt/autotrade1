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
const strategy = require('../strategies/tests/breakoutStrategy.js');

//Parameters
let actions = {};
const rangelimit = 100;
let check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false;
let prices;
global.rangedata = {'resistance': {}, 'support': {}};
global.linedata = {'support': 0, 'resistance': 0, 'support2': 0, 'resistance2': 0, 'midrange': 0};
global.confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
let confirmationlimit = 3;
let timestamp  = moment().format('LLL');

//Begin Exec function
actions.exec = async function(epic, prices){

  return new Promise(async (res, rej) => {

    let pricedata = {'support': [], 'resistance': []};
    let pricedata2 = {'support': [], 'resistance': []};
    let pricedata3 = {'support': [], 'resistance': []};
    confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};
    //confirmations = {'resistance': 0, 'support': 0};
    check0 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false;

  //console.log('--------BEGIN EXEC BREAKOUT STRATEGY');

  //Retrieve data from prices
  //console.log('-------- Prices:');


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

  //console.log('-------- Analyst Data:');

  //UPDATE: Instead of using 3 days of data to create lines, we only use last 24 hours
  let start = (pricedata.support.length - 25);
  pricedata2.support = pricedata.support.filter((price,i) => i > start);
  pricedata2.resistance = pricedata.resistance.filter((price,i) => i > start);

  //pricedata3 does 36 hours
  let start2 = (pricedata.support.length - 37);
  pricedata3.support = pricedata.support.filter((price,i) => i > start2);
  pricedata3.resistance = pricedata.resistance.filter((price,i) => i > start2);

  //console.log(pricedata2);


  let supportline = 0;
  let resistanceline = 0;
  let horizline1 = 0;
  let horizline2 = 0;
  horizline1 = await strategy.actions.calcResistSupport(pricedata2,'support');
  horizline2 = await strategy.actions.calcResistSupport(pricedata2,'resistance');

  //TO DO: Temporary correction if supportline is greater than resistance - this is due to one line having more pricebars recording a higher level than the other during a certain period.
  if(horizline1 > horizline2){
    resistanceline = horizline1;
    supportline = horizline2;
  } else {
    resistanceline = horizline2;
    supportline = horizline1;
  }

  //verify horizontal lines meet conditions
  //must have 50 points minimum distance from each other
  //if are 200 points maximum distance apart, then chart is not considered ranging
  let lineDistance = Math.abs(resistanceline - supportline);
  if((lineDistance > 20 && lineDistance < 200) && (resistanceline > supportline)) check0 = true;

  //Get the percentage change of the first price bar and support/resistance lines
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

  //Determine trend before line ranges
  let trend = 'ranging';
  if((firstClose > lastClose) && (trendDiff >= rangelimit)) trend = 'bearish';
  if((lastClose > firstClose) && (trendDiff >= rangelimit)) trend = 'bullish';

  //If percentage change is significant, confirm trend (0.50% = 50 points which is quite significant)
  //UPDATE: I changed this to 100points for more certainty of momentum
  if(lastDiff > 0.5) check1 = true;

  //count how many confirmations/ re-tests
  if(confirmations.support >= confirmationlimit && confirmations.resistance >= confirmationlimit) check2 = true;

  //console.log(pricedata.support[pricedata.support.length-1]);

  //Lastly, check wick data
  let wickdata = await strategy.actions.calcWicks(pricedata);
  let linedata = {'support': supportline, 'resistance': resistanceline};
  let summary = wickdata.length-1;
  let wds = wickdata[summary];
  let wicktrend = wds.resistance; //trend with strongest resistance for last three price bars
  if(wds.confirmation1 == true) check3 = true;
  if(trend == wicktrend) check4 = true;

  if(lastClose < resistanceline) check5 = true;
  if(lastClose > supportline) check5 = true;

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

  if(beforeRangeTrend == recenttrend) check6 = true;
  if(trend == 'ranging') check7 = true;

  let r = {
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
    //'isStrengthIncreasing': wds.confirmation2,
    'isRangeAreaGood':check0,
    'isLastDiffGreaterThan50Points': check1,
    //'isConfirmationsGreaterThanLimit': check2,
    'isWickConfirmationsTrue': check3,
    'isWickTrendSameAsTrend': check4,
    'islastCloseAboveBelowLines': check5,
    'isRecentTrendSameAsBeforeRange': check6,
    'isTrendRanging': check7,
    'ticket': {}
  };

  //If all checks pass, begin trade
  const checks = [check0,check1,check3,check4,check5,check6,check7];
  if(checks.indexOf(false) == -1){

      //console.log('make trade');

      //stop distance = minimum 1% of lastClose price + fluctuation of 10 as prices are changing
      let stopDistance = Math.round(lastClose * 0.08) + 10;
      //console.log('stop distance: ' + stopDistance);

      //check for existing open tickets
      // await api.showOpenPositions().then(async positionsData => {
      //   console.log(util.inspect(positionsData, false, null));
      //   if(positionsData.positions.length === 0){
      //     console.log('You have no open position, begin trade.');
      //
      //   }
      // }).catch(e => console.log(e));

      ticket = {
        'currencyCode': 'GBP',
        'direction': wicktrend == 'bullish' ? 'BUY' : 'SELL',
        'epic': epic,
        'expiry': 'DFB',
        'size': priceperpoint,
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
      //console.log(ticket);
      r.ticket = ticket;
  }

  res(r);
}).catch(e => {
  rej(e);
});;
}

module.exports = {
  actions: actions
}
