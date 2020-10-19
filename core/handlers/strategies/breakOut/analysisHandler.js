var actions = {};
var core = require.main.exports;

actions.finalAnalysis = async function(){
  let analysis = {
    'pricedata':pricedata,
    'firstClose': firstClose,
    'beforeRangeFirstClose': beforeRangeFirstClose,
    'firstDiff': firstDiff,
    'lastTime': lastTime,
    'lastClose': lastClose,
    'lastCloseAsk': lastCloseAsk,
    'lastCloseBid': lastCloseBid,
    'lastDiff': lastDiff,
    'linedata': linedata,
    'lineDistance': lineDistance,
    'previousTrend' : previousTrend,
    'trend': currenttrend,
    'trendDiff': trendDiff,
    'trendDiffPerc': trendDiffPerc + '%',
    'beforeRangeTrend': beforeRangeTrend,
    'beforeRangeFirstCloseData' : beforeRangeFirstCloseData,
    'beforeRangeTrendDiff': beforeRangeTrendDiff,
    'rangedata_indexes': rangedata.support.prices_idx,
    'recentrange': recentrange,
    'rangeConfirmations':rangeConfirmations,
    'recentTrendArr': recenttrendArr,
    'recentTrend': recenttrend,
    'recentUps': ups,
    'recentDowns':downs,
    'recentMovementValue': movementValue,
    'recentMovementValueDiffPerc': movementValueDiffPerc + '%',
    'isLastDiffGreaterThan20Points': check1,
    'isRangeAreaGood':check0,
    'isRangeConfirmationsGreaterThanLimit': check2,
    'isRecentRangeOverLimit': recentrange.length >= recentrangelimit,
    'recentRangeIndex22': recentrange.indexOf(22),
    'recentRangeIndex23': recentrange.indexOf(23),
    'updatedtrend': trend,
    'islastCloseAboveBelowLines': check5,
    'isRecentTrendSameAsTrend': check6,
    'isBeforeRangeSameAsTrend': check7,
    'isRecentTrendBreaking' : isRecentTrendBreaking,
    'isBreakingThroughRange': check8,
    'isWithinTradeThreshold': check9,
    'isHoursCorrect': check10,
    'totalMissingHours': totalMissingHours,
    'noBumpInRange': check11,
    'bumps': rangedata.bumps,
    'bumpgroupcount': bumpgroupcount,
    'notTradedBefore': check12,
    'beforeRangeOveridden': beforeRangeOveridden,
    'lastBeforeRangeTrendMovement': lastBeforeRangeTrendMovement,
    'lastBeforeRangeTrendMovementClose': lastBeforeRangeTrendMovementClose,
    'lastBeforeRangeTrendMovementTime': lastBeforeRangeTrendMovementTime,
    'lastBeforeRangeTrendMovementDiff': lastBeforeRangeTrendMovementDiff,
    'ticket': {}
  };

  //set previous trend after everything else (using currenttrend to catch 'ranging' otherwise isBreakingThroughRange is false)
  previousTrend = currenttrend;
  //Draw analytics
  core.analytics.actions.drawChart(pricedata3.support, linedata, analysis, rangedata);
}

module.exports = {
  actions: actions
}
