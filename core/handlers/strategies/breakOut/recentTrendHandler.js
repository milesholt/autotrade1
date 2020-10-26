var actions = {};
var core;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
}

/*

DETERMINE RECENT TREND

*/

actions.determineRecentTrend = async function(){
  //loop through recent price bars and determine movement
  ups = 0;
  downs = 0;
  let pl = pricedata.support.length;
  movementValue = parseFloat((pricedata.support[pl-1].close - pricedata.support[pl-recentlimit].close).toFixed(2));
  movementValueDiff = Math.abs(movementValue);
  movementValueDiffPerc = Math.abs(movementValue / pricedata.support[pl-1].close * 100).toFixed(2);
  for(let i = (pl - recentlimit), len = pl; i < len; i++){
    let movement = pricedata.support[i].open > pricedata.support[i].close ? 'down' : 'up';
    if(movement == 'down') { downs++ } else { ups++ };
    recenttrendArr.push(movement);
  }
  recenttrend = 'ranging';
  if((movementValue < 0) && (movementValueDiff >= parseFloat((rangelimit/2).toFixed(2)) )) recenttrend = 'bearish';
  if((movementValue > 0) && (movementValueDiff >= parseFloat((rangelimit/2).toFixed(2)) )) recenttrend = 'bullish';
  if((movementValue < 0) && (downs > ups)) recenttrend = 'bearish';
  if((movementValue > 0) && (ups > downs)) recenttrend = 'bullish';
}

actions.determineRecentRange = async function(){
  //set previous trend for next loop
  //if previous trend was ranging and latest trend isn't, this suggests trend has broken out of range
  //rangeData.support.prices_idx;
  recentrange = [];
  rangeData.support.prices_idx.forEach(pid => {
    if(pid > 12) recentrange.push(pid);
  });
}

module.exports = {
  actions: actions
}
