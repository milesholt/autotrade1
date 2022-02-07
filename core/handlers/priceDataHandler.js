
var actions = {};
var core;
var loop;
var cloud;
var error;
var api;
var analysis;
var moment;
var util;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  loop = core.loopHandler.actions.loop;
  cloud = core.cloudHandler.actions;
  error = core.errorHandler.actions;
  analysis = core.analysisHandler.actions;
  moment = core.moment;
  api = core.api;
  util =  core.util;
  lib = core.lib.actions;
}

/*

GET PRICE DATA
This pulls key data from API and also updates cloud data file

*/

// actions.getPriceData = async function(){
//   if(prices.length == 0){
//     let fromDay = moment(date2).format('dddd');
//     from = (fromDay == 'Saturday' || fromDay == 'Sunday') ? moment(date2).subtract(2,'days').format('YYYY-MM-DD%2000:00:00') : from;
//
//     await api.histPrc(epic, resolution, from, to).then(r => {
//             prices = r.prices;
//             console.log('getting price data for 3 days....');
//             console.log(pricedataDir);
//             if(r.prices.length == 0){
//               let e = {'body':{'errorCode':'customerror.price-data-empty'}};
//               error.handleErrors(e);
//             }
//             cloud.updateFile(prices,pricedataDir);
//     }).catch(async e => {
//       error.handleErrors(e);
//     });
//   } else {
//     await api.histPrc(epic, resolution, from2, to2).then(r => {
//       console.log('from2: ' + from2);
//       console.log('day2: ' + to2);
//       console.log(util.inspect(r, false, null));
//       if(r.prices.length){
//           //Check price bar doesn't already exist on pricedata
//           if(prices[prices.length-1].snapshotTime !== r.prices[0].snapshotTime){
//             //If it does, push new price and remove first hour
//             console.log('New price data: --------');
//             console.log(r.prices[0]);
//             prices.push(r.prices[0]);
//             prices.shift();
//             cloud.updateFile(prices,pricedataDir);
//           }
//       }
//     }).catch(async e => {
//        error.handleErrors(e);
//     });
//   }
// }


actions.getPriceData = async function(res = 'HOUR'){
  let prc = [];
  let prcPath = '';
  let f = '';
  let f2 = '';
  let t = '';
  let name = '';
  let duration = '';
  let pointsLimit = 0;
  switch(res){
    case 'HOUR':
      prc = prices;
      name = 'prices';
      prcPath = pricedataDir;
      f =  from_3days;
      f2 = from_1hour;
      t = to;
      resolution = 'HOUR';
      pointsLimit = resolutionPointsLimit_1Hour;
      duration = '3 days';
    break;
    case 'HOUR_4':
      prc = prices_4hour;
      name = 'prices_4hour';
      prcPath = price4HourdataDir;
      f = from_1week;
      f2 = from_4hours;
      t = to;
      resolution = 'HOUR_4';
      pointsLimit = resolutionPointsLimit_4Hours;
      duration = '1 week';
    break;
  }
  if(prc.length == 0){
    let fromDay = moment(f).format('dddd');
    f = (fromDay == 'Saturday' || fromDay == 'Sunday') ? moment(f).subtract(2,'days').format('YYYY-MM-DD%2000:00:00') : f;

    await api.histPrc(epic, res, f, t).then(r => {
            prc = r.prices;
            console.log('getting price data for ' + duration);
            console.log(pricedataDir);
            if(r.prices.length == 0){
              let e = {'body':{'errorCode':'customerror.price-data-empty'}};
              error.handleErrors(e);
            }
            cloud.updateFile(prc,prcPath);
            eval(name + '= prc');
    }).catch(async e => {
      error.handleErrors(e);
    });
  } else {
    await api.histPrc(epic, res, f2, t).then(r => {
      console.log('from: ' + f2);
      console.log('day: ' + t);
      //console.log(util.inspect(r, false, null));
      if(r.prices.length){
          //Check price bar doesn't already exist on pricedata
          if(prc[prc.length-1].snapshotTime !== r.prices[0].snapshotTime){
            //If it does, push new price and remove first hour
            console.log('New price data: --------');
            console.log(r.prices[0]);
            prc.push(r.prices[0]);
            if(prc.length == pointsLimit) prc.shift();
            cloud.updateFile(prc,prcPath);
            eval(name + '= prc');
          }
      }
    }).catch(async e => {
       error.handleErrors(e);
    });
  }
}


/*

SORT PRICE DATA
Method for sorting pricedata

*/

actions.sortPriceData = async function(){
  if(prices.length > 0){
    prices.forEach(async (price,idx) =>{
      if(price !== null){
        let time =  price.snapshotTime.replace(/\//g, '-');
        let midOpen = parseFloat(parseFloat(price.openPrice.ask - ((price.openPrice.ask - price.openPrice.bid)/2) ).toFixed(2));
        let midClose = parseFloat(parseFloat(price.closePrice.ask - ((price.closePrice.ask - price.closePrice.bid)/2) ).toFixed(2));
        let midHigh = parseFloat(parseFloat(price.highPrice.ask - ((price.highPrice.ask - price.highPrice.bid)/2) ).toFixed(2));
        let midLow = parseFloat(parseFloat(price.lowPrice.ask - ((price.lowPrice.ask - price.lowPrice.bid)/2) ).toFixed(2));
        let askClose = price.closePrice.ask;
        let bidClose = price.closePrice.bid;
        let supportprice = midOpen <= midClose ? midOpen : midClose;
        let resistprice = midOpen >= midClose ? midOpen : midClose;

        //Main pricedata (full capture of 3 days)
        pricedata.support.push({'price': supportprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });
        pricedata.resistance.push({'price': resistprice, 'open':midOpen, 'close': midClose, 'high': midHigh, 'low': midLow, 'diff': Math.round(Math.abs(midOpen - midClose)), 'time': time, 'closeAsk': askClose, 'closeBid': bidClose });

      }else{
        loop('Price undefined? Waiting an hour and trying again');
        return false;
      }
    });

    //Clean data, remove any price data with 0
    pricedata.support = pricedata.support.filter(price => price.open !== 0 && price.close !== 0 && price.high !== 0 && price.low !== 0);
    pricedata.resistance = pricedata.resistance.filter(price => price.open !== 0 && price.close !== 0 && price.high !== 0 && price.low !== 0);
    pricedata.support = pricedata.support.filter(price => price.closeAsk !== null && price.closeBid !== null);
    pricedata.resistance = pricedata.resistance.filter(price => price.closeAsk !== null && price.closeBid !== null);

    prices_4hour = prices_4hour.filter(price => price.highPrice.ask !== null && price.highPrice.bid !== null && price.lowPrice.ask !== null && price.lowPrice.bid !== null && price.closePrice.ask !== null && price.closePrice.bid !== null && price.openPrice.ask !== null && price.openPrice.bid !== null);

    //Second pricedata (24 hour range)
    let start = (pricedata.support.length - 25);
    pricedata2.support = pricedata.support.filter((price,i) => i > start);
    pricedata2.resistance = pricedata.resistance.filter((price,i) => i > start);

    //Third pricedata (36 hour range)
    let start2 = (pricedata.support.length - 37);
    pricedata3.support = pricedata.support.filter((price,i) => i > start2);
    pricedata3.resistance = pricedata.resistance.filter((price,i) => i > start2);

    //Sort analysis of data
    await analysis.analysePriceData();

  } else {
    return false;
  }
}

/*

SET PRICE DATA
Set price data variables

*/

actions.setPriceData = async function(){
  beforeRangeFirstClose = pricedata3.support[0].close;
  firstClose = pricedata2.support[0].close;
  firstDiff = firstClose > resistanceline ? Math.abs(100 - (resistanceline / firstClose * 100)).toFixed(2) : Math.abs(100 - (supportline / firstClose * 100)).toFixed(2);

  //Get percentage change of latest price bar to determine if there is a break
  lastOpen = pricedata.support[pricedata.support.length-1].open;
  lastClose = pricedata.support[pricedata.support.length-1].close;
  lastHigh = pricedata.support[pricedata.support.length-1].high;
  lastLow = pricedata.support[pricedata.support.length-1].low;
  lastTime = pricedata.support[pricedata.support.length-1].time;
  lastCloseAsk = pricedata.support[pricedata.support.length-1].closeAsk;
  lastCloseBid = pricedata.support[pricedata.support.length-1].closeBid;
  lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);

  first4HoursClose = lib.toNumber(((prices_4hour[0].closePrice.ask - prices_4hour[0].closePrice.bid) / 2) + prices_4hour[0].closePrice.bid);

  const mid4hour = prices_4hour[Math.round(prices_4hour.length/2)];

  mid4HoursClose = lib.toNumber(((mid4hour.closePrice.ask - mid4hour.closePrice.bid) / 2) + mid4hour.closePrice.bid);

  let last4Hours = prices_4hour[prices_4hour.length - 1];
  last4HoursClose = lib.toNumber(((last4Hours.closePrice.ask - last4Hours.closePrice.bid) / 2) + last4Hours.closePrice.bid);
}


module.exports = {
  actions: actions
}
