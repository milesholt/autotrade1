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
  trend4HoursDiffPerc = Math.abs(100 - (first4HoursClose / last4HoursClose * 100)).toFixed(2);

  //if prices have moved and over significant distance (range area limit)
  if((first4HoursClose > last4HoursClose) && (trend4HoursDiff >= rangelimit)) trend4Hours = 'bearish';
  if((last4HoursClose > first4HoursClose) && (trend4HoursDiff >= rangelimit)) trend4Hours = 'bullish';
}

module.exports = {
  actions: actions
}
