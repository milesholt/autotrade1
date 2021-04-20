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

  pricedata3.support.forEach(price =>{
    if(price.closeAsk !== null && price.closeBid !== null){
      times.push(price.time);
      closes.push(price.close);
      opens.push(price.open);
      highs.push(price.high);
      lows.push(price.low);
      rangeAnalysis.push(price.low);
      rangeAnalysis.push(price.high);
    }
  });

  rangeAnalysis.sort(lib.sortNumber);

  lowestPrice = rangeAnalysis[0];
  highestPrice = rangeAnalysis[rangeAnalysis.length-1];
  priceDiff = lib.toNumber(highestPrice - lowestPrice);
  rangelimit = (priceDiff * rangeLimitPerc);
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
    'trendDiffPerc': (trendDiffPerc*100) + '% ('+trendDiffPerc+')',
    'beforeRangeTrend': beforeRangeTrend,
    'beforeRangeFirstCloseData' : beforeRangeFirstCloseData,
    'beforeRangeTrendDiff': beforeRangeTrendDiff,
    'beforeRangeTrendDiffPerc': beforeRangeTrendDiffPerc,
    'rangedata_indexes': rangeData.support.prices_idx,
    'lastRangeData': pricedata2.support[rangeData.support.prices_idx[rangeData.support.prices_idx.length -1]],
    'recentrange': recentrange,
    'rangeConfirmations':rangeConfirmations,
    'recentTrendArr': recenttrendArr,
    'recentTrend': recenttrend,
    'recentUps': ups,
    'recentDowns':downs,
    'recentMovementValue': movementValue,
    'recentMovementValueDiffPerc': movementValueDiffPerc + '%',
    'isLastDiffGreaterThanMomentumLimit': check1,
    'isRangeAreaGood':check0,
    'isRangeConfirmationsGreaterThanLimit': check2,
    'isRecentRangeOverLimit': recentrange.length >= recentrangelimit,
    'recentRangeIndex22': recentrange.indexOf(22),
    'recentRangeIndex23': recentrange.indexOf(23),
    'updatedtrend': trend,
    'islastCloseAboveBelowLines': check5,
    'isRecentTrendSameAsTrend': check6,
    'isBeforeRangeSameAsTrend': check7,
    'isBeforeRangeTrendBroken' : check13,
    'isRecentTrendBreaking' : isRecentTrendBreaking,
    'isBreakingThroughRange': check8,
    'isWithinTradeThreshold': check9,
    'isNoVolatileGap': check10,
    'volatilityGapAnalysis': volatilityGapAnalysis,
    'totalMissingHours': totalMissingHours,
    'noBumpInRange': check11,
    'bumps': rangeData.bumps,
    'bumpgroupcount': bumpgroupcount,
    'waves': rangeData.wavecount,
    'notTradedBefore': check12,
    'beforeRangeOveridden': beforeRangeOveridden,
    'lastBeforeRangeTrendMovement': bRD.lastBeforeRangeTrendMovement,
    'lastBeforeRangeTrendMovementClose': bRD.lastBeforeRangeTrendMovementClose,
    'lastBeforeRangeTrendMovementTime': bRD.lastBeforeRangeTrendMovementTime,
    'lastBeforeRangeTrendMovementDiff': bRD.lastBeforeRangeTrendMovementDiff,
    'lastBeforeRangeTrendMovementPerc': bRD.lastBeforeRangeTrendMovementPerc,
    'momentumLimit': momentumLimit,
    'rangeLimit': rangelimit,
    'tradeLimit': tradelimit,
    'lineDistanceLimit': linedistancelimit,
    'priceDiff': priceDiff,
    'ticket': {}
  };

  log.dataLog(analysis);

  //console.log(markets[mid].data);

  //set previous trend after everything else (using currenttrend to catch 'ranging' otherwise isBreakingThroughRange is false)
  previousTrend = currenttrend;
  //Draw analytics
  core.analytics.actions.drawChart(pricedata3.support, lineData, analysis, rangeData);
}

module.exports = {
  actions: actions
}
