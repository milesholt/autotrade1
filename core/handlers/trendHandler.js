var actions = {};
var core;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  lib = core.lib.actions;
}


/*

DETERMINE TREND

*/

actions.determineTrend = async function(){
  trendDiff = parseFloat(Math.abs(firstClose - lastClose).toFixed(2));
  trendDiffPerc = Math.abs(100 - (firstClose / lastClose * 100)).toFixed(2);

  //if prices have moved and over significant distance (range area limit)
  if((firstClose > lastClose) && (trendDiff >= rangelimit)) trend = 'bearish';
  if((lastClose > firstClose) && (trendDiff >= rangelimit)) trend = 'bullish';
}


/* DETERMINE 4 HOUR TREND */

actions.determine4HourTrend = async function(){
  //trend for 4 hours graph
  trend4HoursDiff = parseFloat(Math.abs(first4HoursClose - last4HoursClose).toFixed(2));
  trend4HoursDiffPerc = parseFloat(Math.abs((trend4HoursDiff / priceDiff4Hours) * 100).toFixed(2));

  //trend4HoursDiffPerc = Math.abs(100 - (first4HoursClose / last4HoursClose * 100)).toFixed(2);

  //if prices have moved and over significant distance (range area limit) - 40%
  if((first4HoursClose > last4HoursClose) && (trend4HoursDiffPerc  >= trend4HourLimitPerc)) trend4Hours = 'bearish';
  if((last4HoursClose > first4HoursClose) && (trend4HoursDiffPerc >= trend4HourLimitPerc)) trend4Hours = 'bullish';


  //here we grab the previous 4 hour trend, which should be stored so long as it is not ranging
  let prevStored = lib.isDefined(markets[mid].data,'prevtrend4Hours') ? lib.deepCopy(markets[mid].data.prevtrend4Hours) : prevtrend4Hours;

  prevtrend4Hours = trend4Hours !== 'ranging' ? trend4Hours : prevStored;
}

/* DETERMINE HALF 4 HOUR TREND */

actions.determineMid4HourTrend = async function(){
  //trend for 4 hours graph
  midtrend4HoursDiff = parseFloat(Math.abs(mid4HoursClose - last4HoursClose).toFixed(2));
  midtrend4HoursDiffPerc = parseFloat(Math.abs((midtrend4HoursDiff / priceDiff4Hours) * 100).toFixed(2));

  midtrend4Hours = 'ranging';

  //console.log('midtrend4HoursDiffPerc: ' + midtrend4HoursDiffPerc);
  //console.log('midtrend4HourLimitPerc: ' + midtrend4HourLimitPerc);

  //trend4HoursDiffPerc = Math.abs(100 - (first4HoursClose / last4HoursClose * 100)).toFixed(2);

  //if prices have moved and over significant distance (range area limit) - 40%
  if(midtrend4HoursDiffPerc >= midtrend4HourLimitPerc){
    //console.log('midtrend4HoursDiffPerc is above or equal to limit: ' + midtrend4HourLimitPerc);
    if(mid4HoursClose > last4HoursClose) {
      //console.log('mid4hours is bearish');
      midtrend4Hours = 'bearish';
    } else if(last4HoursClose > mid4HoursClose){
      //console.log('mid4hours is bullish');
      midtrend4Hours = 'bullish';
    } else {
      midtrend4Hours = 'ranging';
    }
  }

  //console.log('mid4hourstrend: ' + midtrend4Hours + ' last4HoursClose: ' + last4HoursClose + ' mid4HoursClose: ' + mid4HoursClose);
}

module.exports = {
  actions: actions
}
