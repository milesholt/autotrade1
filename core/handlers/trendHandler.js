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

module.exports = {
  actions: actions
}
