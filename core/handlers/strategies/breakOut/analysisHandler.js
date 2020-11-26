var actions = {};
var core;
var log;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  log = core.log.actions;
  lib = core.lib.actions;
}

/*

PRICE DATA ANALYSIS

*/

actions.analysePriceData = async function(){
  console.log('analysing price data...');

  pricedata3.support.forEach(price =>{
    times.push(price.time);
    closes.push(price.close);
    opens.push(price.open);
    highs.push(price.high);
    lows.push(price.low);
    rangeAnalysis.push(price.low);
    rangeAnalysis.push(price.high);
  });

  rangeAnalysis.sort(lib.sortNumber);

  lowestPrice = rangeAnalysis[0];
  highestPrice = rangeAnalysis[range.length-1];
  priceDiff = highestPrice - lowestPrice;

  console.log('lowestPrice: ' + lowestPrice);
  console.log('highestPrice: ' + highestPrice);
  console.log('priceDiff: ' + priceDiff);
}

/*

FINAL ANALYSIS

*/

actions.finalAnalysis = async function(){
  analysis = {
    'pricedata':pricedata,
    'firstClose': firstClose,
    'beforeRangeFirstClose': beforeRangeFirstClose,
    'firstDiff': firstDiff,
    'lastTime': lastTime,
    'lastOpen' : lastOpen,
    'lastClose': lastClose,
    'lastCloseAsk': lastCloseAsk,
    'lastCloseBid': lastCloseBid,
    'lastDiff': lastDiff,
    'lineData': lineData,
    'lineDistance': lineDistance,
    'previousTrend' : previousTrend,
    'trend': currenttrend,
    'trendDiff': trendDiff,
    'trendDiffPerc': trendDiffPerc + '%',
    'beforeRangeTrend': beforeRangeTrend,
    'beforeRangeFirstCloseData' : beforeRangeFirstCloseData,
    'beforeRangeTrendDiff': beforeRangeTrendDiff,
    'rangedata_indexes': rangeData.support.prices_idx,
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
    'bumps': rangeData.bumps,
    'bumpgroupcount': bumpgroupcount,
    'notTradedBefore': check12,
    'beforeRangeOveridden': beforeRangeOveridden,
    'lastBeforeRangeTrendMovement': bRD.lastBeforeRangeTrendMovement,
    'lastBeforeRangeTrendMovementClose': bRD.lastBeforeRangeTrendMovementClose,
    'lastBeforeRangeTrendMovementTime': bRD.lastBeforeRangeTrendMovementTime,
    'lastBeforeRangeTrendMovementDiff': bRD.lastBeforeRangeTrendMovementDiff,
    'ticket': {}
  };

  log.dataLog(analysis);

  console.log(markets[mid].data);

  //set previous trend after everything else (using currenttrend to catch 'ranging' otherwise isBreakingThroughRange is false)
  previousTrend = currenttrend;
  //Draw analytics
  core.analytics.actions.drawChart(pricedata3.support, lineData, analysis, rangeData);
}

module.exports = {
  actions: actions
}
