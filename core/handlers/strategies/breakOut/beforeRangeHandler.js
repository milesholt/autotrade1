var actions = {};
var core = require.main.exports;

actions.setBeforeRangeData = function(){
}

actions.determineBeforeRangeData = function(){
  beforeRangeFirstCloseData = pricedata3.support[0];
  beforeRangeTrendDiff = parseFloat(Math.abs(beforeRangeFirstClose - lastClose).toFixed(2));
  if((beforeRangeFirstClose > resistanceline) && (beforeRangeTrendDiff >= (rangelimit/2))) beforeRangeTrend = 'bearish';
  if((beforeRangeFirstClose < supportline) && (beforeRangeTrendDiff >= (rangelimit/2))) beforeRangeTrend = 'bullish';
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
      core.cloudHandler.actions.updateFile(beforeRangeData,beforeRangeDir);
    },10000);
  }
}

module.exports = {
  actions: actions
}
