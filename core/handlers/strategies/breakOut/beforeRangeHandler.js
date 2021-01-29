var actions = {};
var core;
var cloud;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  cloud = core.cloudHandler.actions;
  lib = core.lib.actions;
}

/*

DETERMINE BEFORE RANGE DATA

*/

actions.determineBeforeRangeData = function(){
  beforeRangeFirstCloseData = pricedata3.support[0];
    beforeRangeTrendDiff = parseFloat(Math.abs(beforeRangeFirstClose - lastClose).toFixed(2));

  let oldbeforeRangeTrendDiffPerc = markets[mid].data.beforeRangeTrendDiffPerc ? lib.deepCopy(markets[mid].data.beforeRangeTrendDiffPerc) : beforeRangeTrendDiff;
  console.log('old beforeRangeTrendDiffPerc: ' + oldbeforeRangeTrendDiffPerc);

  beforeRangeTrendDiffPerc = lib.toNumber((100 - (beforeRangeFirstClose / lastClose * 100)), 'abs');
  console.log('new beforeRangeTrendDiffPerc: ' + beforeRangeTrendDiffPerc);
  //if((beforeRangeFirstClose > resistanceline) && (beforeRangeTrendDiff >= (rangelimit/2))) beforeRangeTrend = 'bearish';
  //if((beforeRangeFirstClose < supportline) && (beforeRangeTrendDiff >= (rangelimit/2))) beforeRangeTrend = 'bullish';

  /*
  Possibly addition:
  Count price bars from beforeRangeFirstClose to firstClose
  Then count how many are up or down
  if the trend matches and there are more bars than the last beforeRangeTrend, then we overide, as there are enough bars to justify the trend and there are also more than the previous which justifies overide
  */

  if((beforeRangeFirstClose > resistanceline) && (beforeRangeTrendDiffPerc >= momentLimitPerc) && (beforeRangeTrendDiffPerc > oldbeforeRangeTrendDiffPerc)) beforeRangeTrend = 'bearish';
  if((beforeRangeFirstClose < supportline) && (beforeRangeTrendDiffPerc >= momentLimitPerc) && (beforeRangeTrendDiffPerc > oldbeforeRangeTrendDiffPerc)) beforeRangeTrend = 'bullish';
  if(beforeRangeTrend !== 'ranging'){
    bRD.lastBeforeRangeTrendMovement = beforeRangeTrend;
    bRD.lastBeforeRangeTrendMovementClose = beforeRangeFirstClose;
    bRD.lastBeforeRangeTrendMovementTime = beforeRangeFirstCloseData.time;
    let beforeRangeData = {
      'lastBeforeRangeTrendMovement': bRD.lastBeforeRangeTrendMovement,
      'lastBeforeRangeTrendMovementClose' : bRD.lastBeforeRangeTrendMovementClose,
      'lastBeforeRangeTrendMovementTime' : bRD.lastBeforeRangeTrendMovementTime
    }
    setTimeout(()=>{
      console.log('updating beforeRangeData file after 10 seconds');
      cloud.updateFile(beforeRangeData,beforeRangeDir);
    },10000);
  }
}

module.exports = {
  actions: actions
}
