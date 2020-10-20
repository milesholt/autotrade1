var actions = {};
var core;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
}

/*

CHECK LINES

*/

actions.checkLines = async function(){
  let lineDistance = parseFloat(Math.abs(resistanceline - supportline).toFixed(2));
  if((lineDistance >= linedistancelimit && lineDistance <= rangelimit) && (resistanceline > supportline)) check0 = true;
}

/*

CHECK RANGE

*/

actions.checkRangeConfirmations = async function(){
  let rangeConfirmations = rangeData.support.prices_idx.length;
  if(rangeConfirmations >= rangeConfirmationLimit) check2 = true;
}

/*

FINAL CHECKS

*/

actions.finalChecks = async function(){
  if(lastDiff > 0.2) check1 = true;
  //Possible addition of check5
  //this checks to ensure last price bar is either above support/resistance depending on trend
  //eg. you wouldn't want last price bar to bearish, matching with initial direction but far above resistance line, which would actually suggest it was bullish overall
  if(lastClose < supportline && lastClose < resistanceline) check5 = true;
  if(lastClose > supportline && lastClose > resistanceline) check5 = true;
  if(trend == recenttrend) check6 = true;
  if(trend == beforeRangeTrend) check7 = true;
  if((previousTrend == 'ranging' || (check2 == true && recentrange.length >= recentrangelimit)) && (recentrange.indexOf(22) !== -1 || recentrange.indexOf(23) !== -1) && trend !== 'ranging'){
    check8 = true;
  }
  //trade threshold check - If the price goes in the right direction, but way beyond expected area of profit (a sudden significant ride or drop). if this happens, it can take longer to recover and usually moves in the opposite direction afterward
  if(trend == 'bullish' && (Math.abs(lastClose - resistanceline) >= tradelimit)) check9 = false;
  if(trend == 'bearish' && (Math.abs(lastClose - supportline) >= tradelimit)) check9 = false;
  if(Math.abs(lastClose - lastOpen) >= tradelimit) check9 = false;
  check10 = isHoursCorrect;
  //if a number of checks are passed, we overide beforeRangeTrend and pass only if lastBeforeRangeMovement is also the same as trend
  //lastBeforeRangeMovement only holds 'bullish' or 'bearish' when last recorded as beforeRangeTrend
  //this is to capture longer ranging staircase patterns, where the beforeRangeTrend might be outside number of hours we set as parameter
  beforeRangeOveridden = false;
  lastBeforeRangeTrendMovementDiff = parseFloat(Math.abs(lastBeforeRangeTrendMovementClose - lastClose).toFixed(2));
  if(beforeRangeTrend == 'ranging' && trend == lastBeforeRangeTrendMovement && check8 == true && check5 == true && lastBeforeRangeTrendMovementDiff >= (rangelimit/2)) {
    check7 = true;
    beforeRangeOveridden = true;
  }
  if(rangeData.bumps.length > 0 && bumpgroupcount >= bumpgrouplimit) check11 = false;
  if(tradedbefore) check12 = false;
}

module.exports = {
  actions: actions
}
