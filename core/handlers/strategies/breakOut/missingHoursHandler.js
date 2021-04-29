var actions = {};
var core;
var moment;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  moment =  core.moment;
  lib = core.lib.actions;
}

/*

DETERMINE MISSING HOURS

*/

actions.determineMissingHours = async function(){
  //loop through times and ensure no hours / data is missing (on Fridays for example, the market closes, there is a gap in hours which affects the data)
  let time = moment(pricedata3.support[0].time);
  isHoursCorrect = true;
  totalMissingHours = 0;
  let start = 0, end = 0, diff = 0, d = 0;

  pricedata3.support.forEach((price,index) => {
    //skip the first hour
    if(index !== 0){
      // let ntime = moment(price.time);
      // let diff = Math.abs(time.diff(ntime, 'minutes'));
      // if(diff !== 60) totalMissingHours += diff / 60;
      // time = moment(price.time);

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
}

actions.determineVolatilityGap = async function(){
  //if there is a gap of missing hours (ie. weekend)
  //if price data varies aggresively, this suggests Volatility
  //return false if volatile
  let r = true;
  const priceVolatilityLimit = 70; //70%
  let start = 0, end = 0, diff = 0, d = 0, close2 = 0;
  let time = moment(pricedata2.support[0].time);
  let close = pricedata2.support[0].close;

  pricedata2.support.forEach((price,index) => {
    //skip the first hour
    if(index !== 0){
      start = time;
      end = moment(price.time);
      close2 = price.close;
      diff = end.diff(start, "hours") - 1; //remove by one because we only want the number of hours in between
      d = diff == -1 ? 0 : diff;
      if(d > missingHoursLimit){
        const priceDiff = Math.abs(close - close2);
        const priceDiffPerc = (priceDiff / close2) * 100;
        if(lib.toNumber(priceDiffPerc) >= priceVolatilityLimit) {
          r = false;
          volatilityGapAnalysis.push({ 'time': price.time, 'diffPerc': priceDiffPerc, 'close': close, 'close2': close2 });
        }
      }
      close = price.close;
      time = moment(price.time);
    }
  });

  isNoVolatileGap = r;

}

module.exports = {
  actions: actions
}
