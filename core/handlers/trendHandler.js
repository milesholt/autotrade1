var actions = {};
var core;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
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
}

/* DETERMINE HALF 4 HOUR TREND */

actions.determineMid4HourTrend = async function(){
  //trend for 4 hours graph
  midtrend4HoursDiff = parseFloat(Math.abs(mid4HoursClose - last4HoursClose).toFixed(2));
  midtrend4HoursDiffPerc = parseFloat(Math.abs((midtrend4HoursDiff / priceDiff4Hours) * 100).toFixed(2));

  //trend4HoursDiffPerc = Math.abs(100 - (first4HoursClose / last4HoursClose * 100)).toFixed(2);

  //if prices have moved and over significant distance (range area limit) - 40%
  if((mid4HoursClose > last4HoursClose) && (midtrend4HoursDiffPerc  >= midtrend4HourLimitPerc)) midtrend4Hours = 'bearish';
  if((last4HoursClose > mid4HoursClose) && (midtrend4HoursDiffPerc >= midtrend4HourLimitPerc)) midtrend4Hours = 'bullish';
  console.log('mid4hourstrend: ' + midtrend4Hours);
}

module.exports = {
  actions: actions
}
