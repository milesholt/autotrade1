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

DETERMINE RECENT TREND

*/

actions.determineRecentTrend = async function(){
  //loop through recent price bars and determine movement
  ups = 0;
  downs = 0;
  let pl = pricedata.support.length;
  movementValue = parseFloat((pricedata.support[pl-1].close - pricedata.support[pl-recentlimit].close).toFixed(2));
  movementValueDiff = Math.abs(movementValue);
  //movementValueDiffPerc = Math.abs(movementValue / pricedata.support[pl-1].close * 100).toFixed(2);
  //UPDATE: Get percentage of recentMovementValue out of difference between the highest and lowest prices (priceDiff) rather than last price bar (as above)
  //movementValueDiffPerc = lib.toNumber(((movementValue / priceDiff) * 100), 'abs');
  movementValueDiffPerc = lib.toNumber(((movementValue / priceDiff)), 'abs');
  for(let i = (pl - recentlimit), len = pl; i < len; i++){
    let movement = pricedata.support[i].open > pricedata.support[i].close ? 'down' : 'up';
    if(movement == 'down') { downs++ } else { ups++ };
    recenttrendArr.push({'movement': movement, 'open': pricedata.support[i].open, 'close': pricedata.support[i].close });
  }
  recenttrend = 'ranging';
  //Possibly update below as this is now outdated since we now have momentumLimit
  //We could instead replace this and UPDATE with if movementValueDiff greater than momentumLimit, as we are then comparing movements with a movement type limit rather than half the range area
  //if((movementValue < 0) && (movementValueDiff >= parseFloat((rangelimit/2).toFixed(2)) )) recenttrend = 'bearish';
  //if((movementValue > 0) && (movementValueDiff >= parseFloat((rangelimit/2).toFixed(2)) )) recenttrend = 'bullish';
  //UPDATE - if recentMovementValueDiffPerc is above momentumLimitPerc
  if((movementValue < 0) && (movementValueDiffPerc >= momentLimitPerc )) recenttrend = 'bearish';
  if((movementValue > 0) && (movementValueDiffPerc >= momentLimitPerc )) recenttrend = 'bullish';

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
