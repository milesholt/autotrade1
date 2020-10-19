
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
moment().format();

let prices;
let pricedata = {'support': [], 'resistance': []};
let confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;

exec();

//Execute async script
async function exec(){

  console.log('--------BEGIN EXEC AUTO TRADE');

  //Logout --clears tokens
  // console.log('-------Logging out');
  // await api.logout(true).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Switch Default Account (Spread - Z32EDV, CFD - Z32EDW)
  // console.log('-------Switching accounts');
  // await api.switchDefaultAcct('Z32EDV').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check account
  console.log('-------Checking account');
  await api.acctInfo().then(r => {
    //console.log(r);
  }).catch(e => console.log(e));

  //Search contract
  //CS.D.BITCOIN.TODAY.IP
  // console.log('-------Searching for Epics');
  // await api.search('Bitcoin').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check pricing data
  //Resolution: DAY, HOUR, HOUR_2, HOUR_3, HOUR_4, MINUTE, MINUTE_10, MINUTE_15, MINUTE_2, MINUTE_3,MINUTE_30, MINUTE_5, MONTH, SECOND, WEEK
  console.log('-------Retreiving historic pricing data for Bitcoin');
  const epic = 'CS.D.BITCOIN.TODAY.IP';
  const resolution = 'HOUR';

  //get dateRegvar today = new Date();
  // var dd = today.getDate();
  // var mm = today.getMonth() + 1; //January is 0!
  //
  // var yyyy = today.getFullYear();
  // if (dd < 10) {
  //   dd = '0' + dd;
  // }
  // if (mm < 10) {
  //   mm = '0' + mm;
  // }
  // var today = yyyy + '-' + mm + '-' + dd;
  // var befpre = yyyy + '-' + mm + '-' + dd;
  const date1 = moment().add(1, 'days').format('YYYY-MM-DD');
  const date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
  console.log(date1);
  console.log(date2);


  const from = date2+'%20'+'00:00:00';
  const to = date1+'%20'+'00:00:00';
  await api.histPrc(epic, resolution, from, to).then(r => {
    //console.log(util.inspect(r,false,null));
    prices = r.prices;
  }).catch(e => console.log(e));

  //Get Epic data
  // console.log('-------Retreiving information for Bitcoin');
  // const epics = ['CS.D.BITCOIN.TODAY.IP'];
  // await api.epicDetails(epics).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

console.log('-------- Prices:');
//console.log(util.inspect(prices,false,null));

/* Work out Support Line based on average number of lowest prices */

//work out mid price (spreads between bid and ask/offer)

let arr = [0,1,2];
console.log(typeof prices);
prices.forEach((price,idx) =>{
  //console.log(price);
  let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
  let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
  let midHigh = price.highPrice.ask - (parseInt(price.highPrice.ask - price.highPrice.bid)/2);
  let midLow = price.lowPrice.ask - (parseInt(price.lowPrice.ask - price.lowPrice.bid)/2);
  let supportprice = midOpen <= midClose ? midOpen : midClose;
  let resistprice = midOpen >= midClose ? midOpen : midClose;
  // console.log('--------' + idx);
  // console.log(price.openPrice.ask);
  // console.log(price.openPrice.bid);
  // console.log('midOpen:' + midOpen);
  // console.log('midClose:' + midClose);
  // console.log('lowest:' + lowest);
  pricedata.support.push({'price': supportprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose))});
  pricedata.resistance.push({'price': resistprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose))});
});

console.log('-------- Analyst Data:');
//console.log(util.inspect(supportdata,false,null));

let supportline = 0;
let resistanceline = 0;

const firstClose = pricedata.support[0].close;
const lastClose = pricedata.support[pricedata.support.length-1].close;

supportline = await calc(pricedata,'support');
resistanceline = await calc(pricedata,'resistance');

console.log('Resistance line for mid prices:' + resistanceline);
console.log('Support line for mid prices:' + supportline);
console.log('First price bar reading:' + firstClose);
console.log('Last price bar reading:' + lastClose);

//Get the percentage change of the first price bar and support/resistance lines
let firstDiff = firstClose > resistanceline ? Math.abs(100 - (resistanceline / firstClose * 100)).toFixed(2) : Math.abs(100 - (supportline / firstClose * 100)).toFixed(2);

//Get percentage change of latest price bar to determine if there is a break
let lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);

console.log('firstDiff:' + firstDiff);
console.log('lastDiff:' + lastDiff);

//Determine trend before line ranges
let trend = firstClose > resistanceline ? 'bearish' : 'bullish';

//If percentage change is significant, confirm trend (0.50% = 50 points which is quite significant)
if(lastDiff > 0.50){
  console.log('first close percentage change:' + firstDiff);
  console.log('Trend before range is:' + trend);

  console.log(confirmations.support);
  console.log(confirmations.resistance);

  //count how many confirmations/ re-tests
  if(confirmations.support >= confirmationlimit && confirmations.resistance >= confirmationlimit){
    console.log('reached number of confirmations needed to trade');
  }

  //now determine possible break from zone
  let lastdiffcheck = false;
  if(lastDiff > 0.50){
    lastdiffcheck = true;
    console.log('last close percentage change:' + lastDiff);
    console.log('last close has a strong percentage change, past 50 points. Possible break trigger');
  }

  //determine wick resistance strength
  let wickdata = await calcWicks(pricedata);
  let wickcheck = false;
  let summary = wickdata.length-1;

  console.log(wickdata);
  console.log('wickdata summary index: ' + summary);
  console.log('trend:' + trend);
  console.log('wickdata resistance:' + wickdata[summary].resistance);
  console.log('confirmation1: ' + wickdata[summary].confirmation1);
  console.log('confirmation2: ' + wickdata[summary].confirmation2);


  if(wickdata[summary].resistance == trend && wickdata[summary].confirmation1 == true && wickdata[summary].confirmation2 == true){
    console.log('wick data suggests possible break in correct trendline. Break trigger confirmation');
    wickcheck = true;
  } else{
    console.log('wick data did not pass confirmations. No trade. Waiting another hour');
    let timestamp  = moment().format('LLL');
    console.log('Time is:' + timestamp);

    //wait for duration then restart function
    setTimeout(() => {
      exec();
    }, 60 * 60 * 1000);
  }

  if(lastdiffcheck && wickcheck){

    let trade;
    //begin trade

    //check for existing open tickets
    await api.showOpenPositions().then(r => {
      console.log(util.inspect(r, false, null));
      if(r.positions.length === 0){
        console.log('You have no open position, begin trade.');
        ticket = {
        	'currencyCode': 'GBP',
        	'direction': trend == 'bullish' ? 'BUY' : 'SELL', // 'BUY' or 'SELL'
        	'epic': epic,
        	'expiry': 'DFB',
        	'size': 0.5, //min per point is 0.5
        	'forceOpen': true, // if true a new order will not cancel out existing one; has to be true for any LIMIT order type
        	'orderType': 'MARKET', // 'LIMIT' or 'MARKET'
        	'level': null, // specify only when orderType = LIMIT
        	'limitDistance': 100, // close when profit exceeds limitDistance points
        	'limitLevel': null, // close at profit when price close to limitLevel price
        	'stopDistance': 100, // close when loss exceeds stopDistance points (min distance 1%, 100points)
        	'stopLevel': null, // close at loss when price close to limitLevel price
        	'guaranteedStop': false,
        	'timeInForce': 'FILL_OR_KILL', // 'FILL_OR_KILL' or 'EXECUTE_AND_ELIMINATE'
        		// 'FILL_OR_KILL': will try to fill this entire order within the constraints set by {order_type} and {level}, however if this is not possible then the order will not be filled at all
        		// 'EXECUTE_AND_ELIMINATE': will fill this order as much as possible within the constraints set by {order_type} and {level}
        	'trailingStop': null,
        	'trailingStopIncrement': null
        };
        console.log(ticket);
        //api.deal(ticket).then(r => console.log(util.inspect(r, false, null))).catch(e => console.log(e));
      } else {

        console.log('You are already trading on this epic. Waiting 1 hour...');
        let timestamp  = moment().format('LLL');
        console.log('Time is:' + timestamp);

        //wait for duration then restart function
        setTimeout(() => {
          exec();
        }, 60 * 60 * 1000);
      };
    }).catch(e => console.log(e));

  }

} else {
  console.log('No trend detected. Market is probably still ranging. Waiting 1 hour before retrying...');
  let timestamp  = moment().format('LLL');
  console.log('Time is:' + timestamp);
  //wait for duration then restart function
  setTimeout(() => {
    exec();
  }, 60 * 60 * 1000);
}

}//end of exec


/* Functions */

function sortNumber(a, b) {
  return a - b;
}

/* Calculates Resistance and Support Lines */

//TODO: Determine spread of matches, if it is below half the date range, this doesn't count as a line.

async function calc(pricedata,type){

  let prices = pricedata[type].map(r => parseInt(r.price));
  let margin = 2 //the smaller the margin, the more accurate

  //sort newdata by order
  prices.sort(sortNumber);

  //console.log('price data ordered:');
  //console.log(pricedata[type]);

  let matches = [];
  let line = 0;

  //loop through min and max values of lowprices
  for(let i = prices[0], len = prices[prices.length - 1]; i <= len; i++){
    let match = false
    let m = [];

    //for each value, find the difference for each lowprice
    prices.forEach(price => {

      price = parseFloat(price);
      let diff = Math.abs(price - i);

      //if the difference is small (eg. 2 ), count as a potential match

      if(diff <= margin){
        match = true;
        //push each lowprice as part of that match
        m.push(price);
      }
    });
    //push number of matching lowprices with matched value
    if(match) matches.push({'integer': i.toFixed(2),'prices': m});
  }

  //let mostprices = 0;

  //console.log(matches);

  //loop through matches
  matches.forEach(match =>{
    //if value has the greatest number of lowprices, this becomes the support / resistance line
    if(match.prices.length >= confirmations[type]){
      line = match.integer;
      confirmations[type] = match.prices.length;
    }
  });

  return line;
}


async function calcWicks(pricedata){

  //set how many wicks to check
  let wicklimit = 4;

  let wickdata = [];
  let beardir = bulldir = 0;
  let dir = '';
  let strength = false;
  let confirmation1 = false;
  let confirmation2 = false;

  for(let i = (pricedata.support.length-wicklimit) , len = pricedata.support.length-1; i < len; i++){

    console.log(pricedata.support[i]);
    let pricebar = pricedata.support[i];
    let open = pricebar.open;
    let close = pricebar.close;
    let highest = pricebar.high;
    let lowest = pricebar.low;

    //get total difference of price bar
    let pricediff = Math.round(highest - lowest);

    //get percentage of bearish resistance (top wick)
    let topwick = ((highest - (open > close ? open : close)) /  pricediff) * 100;

    //get percentage of bullish resistance (bottom wick)
    let botwick = (((open < close ? open : close) - lowest) /  pricediff) * 100;

    //get total percentage of wick
    let wickstrength = 100 - ((Math.abs(open - close) / pricediff) * 100);

    topwick > botwick ? beardir++ : bulldir++;

    wickdata.push({'pricediff': pricediff, 'topwick': Math.round(topwick), 'botwick': Math.round(botwick), 'strength': Math.round(wickstrength), 'direction': (topwick > botwick ? 'down' : 'up') });

  }

  console.log(bulldir);
  console.log(beardir);

  resistance = bulldir > beardir ? 'bullish' : 'bearish';
  strength = Math.abs(wickdata[0].strength - wickdata[2].strength);

  //is wicks percentage change of strength greater than 50%?
  if (strength >= 50) confirmation1 = true;

  //is wick resistance growing?
  if (wickdata[0].strength < wickdata[2].strength) confirmation2 = true;

  wickdata.push({'resistance': resistance, 'strength': strength, 'confirmation1': confirmation1, 'confirmation2': confirmation2});

  //wickdata.push({'resistance': resistance, 'strength': strength, 'confirmation1': true, 'confirmation2': true});

  return wickdata;

}
