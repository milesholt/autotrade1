var actions = {};
var core;
var log;
var lib;
var moment;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  log = core.log.actions;
  lib = core.lib.actions;
  moment = core.moment;
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

  //sort 4 hours data
  prices_4hour.forEach((price, i) =>{

    let midHigh = lib.toNumber(((price.highPrice.ask - price.highPrice.bid) / 2) + price.highPrice.bid);
    let midLow = lib.toNumber(((price.lowPrice.ask - price.lowPrice.bid) / 2) + price.lowPrice.bid);
    let midClose = lib.toNumber(((price.closePrice.ask - price.closePrice.bid) / 2) + price.closePrice.bid);
    let midOpen = lib.toNumber(((price.openPrice.ask - price.openPrice.bid) / 2) + price.openPrice.bid);
    let time = price.snapshotTime.replace(/\//g, '-');

    times4.push(time);

    highs4.push(midHigh);
    lows4.push(midLow);
    close4.push(midClose);
    open4.push(midOpen);

    range4.push(midLow);
    range4.push(midHigh);

  });

  range4.sort(lib.sortNumber);

  lowest4HourPrice = range4[0];
  highest4HourPrice = range4[range4.length-1];
  priceDiff4Hours = lib.toNumber(highest4HourPrice - lowest4HourPrice);

}


/*

DETERMINE STOP DISTANCE

*/

actions.determineStopDistance = async function(){

  //Stop distance to be % of price diff, expanded from support/resistance line

let cp = trend == 'bullish' ? lastCloseAsk : lastCloseBid;

let stopDistanceOffset = lib.toNumber(priceDiff * market.stopDistancePerc);

if(trend == 'bullish') stopDistanceLevel = lib.toNumber(( lineData.support - stopDistanceOffset), 'abs');
if(trend == 'bearish') stopDistanceLevel = lib.toNumber(( lineData.resistance + stopDistanceOffset), 'abs');

stopDistance = lib.toNumber((cp - stopDistanceLevel), 'abs');

}


/*

DETERMINE LIMIT DISTANCE

*/

//NEW LOGIC
/*

The logic is as follows:
When BUYING the openprice is the askprice, but it closes on bidprice, and vice versa for SELL
With this in mind, we need to account for the difference between these two prices and adjust it with the distance

The following calculations do the following:

get a percentage of ask/bid price depending on direction
we then get difference between ask and bid prices
for limit - we subtract the difference
for stop - we add the difference

*/

actions.determineLimitDistance = async function(){

let limitDistanceOffset = lib.toNumber(priceDiff * market.limitDistancePerc);
let cp = trend == 'bullish' ? lastCloseAsk : lastCloseBid;

//This calculation arrives to the same values as the logic above
//It essentially does everything in one line, calculating the difference while adding/substracting the distance depending on whether it is limit or stop
//OLD
//limitDistance = lib.toNumber((lastCloseAsk - (lastCloseBid + limitDistanceOffset)),'abs');

if(trend == 'bullish') limitDistanceLevel = lib.toNumber(( lineData.resistance + limitDistanceOffset), 'abs');
if(trend == 'bearish') limitDistanceLevel = lib.toNumber(( lineData.support - limitDistanceOffset), 'abs');

limitDistance = lib.toNumber((cp - limitDistanceLevel), 'abs');



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
    'lastHigh': lastHigh,
    'lastLow': lastLow,
    'lastDiff': lastDiff,
    'lineData': lineData,
    'lineDistance': lineDistance,
    'previousTrend' : previousTrend,
    'trend4Hours':trend4Hours,
    'trend4HoursDiff':trend4HoursDiff,
    'trend4HoursDiffPerc':trend4HoursDiffPerc,
    'first4HoursClose':first4HoursClose,
    'last4HoursClose':last4HoursClose,
    'highest4HourPrice': highest4HourPrice,
    'lowest4HourPrice': lowest4HourPrice,
    'priceDiff4Hours': priceDiff4Hours,
    'is4HoursTrendOveride': is4HoursTrendOveride,
    'is4HoursNotRanging':check14,
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
    //'isLastDiffGreaterThanMomentumLines': check1,
    'isRangeAreaGood':check0,
    'isRangeConfirmationsGreaterThanLimit': check2,
    'isRecentRangeOverLimit': recentrange.length >= recentrangelimit,
    'recentRangeIndex21': recentrange.indexOf(21),
    'recentRangeIndex22': recentrange.indexOf(22),
    'recentRangeIndex23': recentrange.indexOf(23),
    'updatedtrend': trend,
    //'islastCloseAboveBelowLines': check5,
    'isRecentTrendSameAsTrend': check6,
    'isBeforeRangeSameAsTrend': check7,
    'isBeforeRangeTrendNotBroken' : check13,
    //'isRecentTrendBreaking' : isRecentTrendBreaking,
    'isBreakingThroughRange': check8,
    'isWithinTradeThreshold': check9,
    'isNoVolatileGap': check10,
    'volatilityGapAnalysis': volatilityGapAnalysis,
    'totalMissingHours': totalMissingHours,
    'noBumpInRange': check11,
    'bumps': rangeData.bumps,
    'bumpgroupcount': bumpgroupcount,
    'waves': rangeData.wavecount,
    'wavePoints':rangeData.waves.length,
    'enoughWaves':check15,
    'notTradedBefore': check12,
    'lastTimeTraded': market.tradedBefore !== false ? moment(market.tradedBefore).format('LLL') : false,
    'tradedBeforeHoursDiff': market.tradedBefore !== false ? moment().diff(moment(market.tradedBefore).valueOf(), "hours") : false,
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
    'stopDistance': stopDistance,
    'stopDistanceLevel': stopDistanceLevel,
    'limitDistance': limitDistance,
    'limitDistanceLevel': limitDistanceLevel,
    'ticket': lib.isEmpty(market.deal) == false ? market.deal.ticket : {}
  };


  await log.analysisLog(analysis);

  await log.dataLog(analysis);

  //console.log(markets[mid].data);

  //set previous trend after everything else (using currenttrend to catch 'ranging' otherwise isBreakingThroughRange is false)
  previousTrend = currenttrend;
  //Draw analytics
  await core.analytics.actions.drawChart(pricedata3.support, lineData, analysisDataSet, rangeData);
  //Draw analytics (4 hour)
  await core.analytics.actions.drawChart4Hours();
}

module.exports = {
  actions: actions
}
