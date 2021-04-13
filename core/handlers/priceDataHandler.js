
var actions = {};
var core;
var loop;
var cloud;
var error;
var api;
var analysis;
var moment;

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
}

/*

GET PRICE DATA
This pulls key data from API and also updates cloud data file

*/

actions.getPriceData = async function(){
  if(prices.length == 0){
    let fromDay = moment(date2).format('dddd');
    from = (fromDay == 'Saturday' || fromDay == 'Sunday') ? moment(date2).subtract(2,'days').format('YYYY-MM-DD') +'%20'+'00:00:00' : from;

    await api.histPrc(epic, resolution, from, to).then(r => {
            prices = r.prices;
            console.log('getting price data for 3 days....');
            console.log(pricedataDir);
            if(r.prices.length == 0){
              let e = {'body':{'errorCode':'customerror.price-data-empty'}};
              error.handleErrors(e);
            }
            cloud.updateFile(prices,pricedataDir);
    }).catch(async e => {
      error.handleErrors(e);
    });
  } else {
    await api.histPrc(epic, resolution, from2, to2).then(r => {
      console.log('from2: ' + from2);
      console.log('day2: ' + to2);
      if(r.prices.length){
          //Check price bar doesn't already exist on pricedata
          if(prices[prices.length-1].snapshotTime !== r.prices[0].snapshotTime){
            //If it does, push new price and remove first hour
            console.log('New price data: --------');
            console.log(r.prices[0]);
            prices.push(r.prices[0]);
            prices.shift();
            cloud.updateFile(prices,pricedataDir);
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
  lastTime = pricedata.support[pricedata.support.length-1].time;
  lastCloseAsk = pricedata.support[pricedata.support.length-1].closeAsk;
  lastCloseBid = pricedata.support[pricedata.support.length-1].closeBid;
  lastDiff = lastClose > resistanceline ? Math.abs(100 - (resistanceline / lastClose * 100)).toFixed(2) : Math.abs(100 - (supportline / lastClose * 100)).toFixed(2);
}


module.exports = {
  actions: actions
}
