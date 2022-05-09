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


/* DETERMINE ADJUST POSITION */

/*

If price is above 60%
edit position, and increase/decrease limit and stop
update logs
*/

actions.determineAdjustPosition =  async function(d){
  //get percentage away from limit of current price from open
  let pointsMoved = Math.abs(d.level - d.open);
  let pointsRange = Math.abs(d.limit - d.open);
  let percDiff = ( pointsMoved / pointsRange * 100);

  //get current price from streaming activity
  if(percDiff >= 60){

    //Get existing ticket
    let t = lib.deepCopy(markets[mid].deal.startAnalysis.ticket);
    let dId = lib.deepCopy(markets[mid].deal.dealId);
    let dRef = lib.deepCopy(markets[mid].deal.dealRef);

    //The information on the ticket does not change, we are simply moving the same limit and stop distances (points) to where the current prices is

    //Edit ticket
    await api.editPosition(dId, t).then(async r => {

      //Once position has been edited on API, we need to update logs and restart monitoring and streaming

      //First, stop monitoring and unsubscribe from stream, also remove from monitor log
      await monitor.stopMonitor(d.epic);
      await monitor.closeMonitorLog(d.epic);

      //Update trade data
      await log.editTradeLog(t);

      //Update market data
      await markets[mid].deal.startAnalysis = t;
      await cloud.updateFile(markets,marketDataDir);

      //Then restart monitor with new log information
      await monitor.iniMonitor(dId,dRef,d.epic);

      //Update monitor
    }).catch(e => {
      //Handle error creating ticket
      console.log('Error updating ticket');
      console.log(e);
    });
  }
}


/*

DETERMINE SIZE

UPDATE:

  //The stop and level distances have already been calculated in analysis.js and should replicate whats on the chart, which is why determineStop and determineProfit should not be used, as they recalculate this, and set different distances, some being closer to the opening position is size is miscalculated

New method to use buy and sell lines as distances, and to then calculate size instead, using a limit of a certain amount

*/

actions.determineSize = async function(){


  let cp = trend == 'bullish' ? lastCloseAsk : lastCloseBid;
  // stopDistance = Math.abs(cp - stopDistanceLevel);
  // limitDistance = Math.abs(cp - limitDistanceLevel);

  //By dividing the maximum stop amount by the distance, we can determine what the size should be
  size = Math.round(maxStop / stopDistance);

  let minSize = market.minimumSize.type == 'points' ?  market.minimumSize.value : lib.toNumber(cp * market.minimumSize.value);

  if(size <= minSize) size = minSize;

  console.log('size: ' + size);

  let profitLoss = (stopDistance * size);

  if(profitLoss >= (maxStop)){
    console.log('profitLoss: ' + profitLoss + ' is greater than maxStop: ' + (maxStop));
    console.log('Consider using different market');
    isDeal = false;
  }

  //console.log(stopDistance);
  //console.log(limitDistance);
}


/*

DETERMINE STOP DISTANCE

*/

actions.determineStopDistance = async function(){

  //Stop distance to be % of price diff, expanded from support/resistance line
  let cp = trend == 'bullish' ? lastCloseAsk : lastCloseBid;
  let stopDistanceOffset = await actions.calculateOffset('stopDistancePerc',cp);

  if(trend == 'bullish') stopDistanceLevel = lib.toNumber(( cp - stopDistanceOffset), 'abs');
  if(trend == 'bearish') stopDistanceLevel = lib.toNumber(( cp + stopDistanceOffset), 'abs');

  stopDistance = lib.toNumber((cp - stopDistanceLevel), 'abs');

  console.log('epic: ' + market.epic);
  console.log('stopDistanceOffset: ' + stopDistanceOffset);
  console.log('stopDistance: ' +  stopDistance);



  //  let potentialLossAmount = stopDistance * market.size;
  //  let newStopDistance = (availableLoss / market.size);
  //  let maxStopDistance = (maxStop / market.size);
  //
  //  //console.log('potentialLossAmount: ' + potentialLossAmount);
  //  //console.log('calculatedAvailableLoss: ' + availableLoss);
  //  //console.log('newStopDistance: ' + newStopDistance);
  //
  // if(potentialLossAmount >= availableLoss){
  //   //console.log('potentialLossAmount greater than or equal to availableLoss, using newStopDistance based on availabe loss.');
  //   stopDistance = newStopDistance;
  // }
  //
  // if(potentialLossAmount >= maxStop){
  //   //console.log('potentialLossAmount greater than or equal to maxStop, using maxStopDistance based on maximum loss.');
  //   stopDistance = maxStopDistance;
  // }


  /* logic

  We want to assign a percentage of funds available as the amount we are risking to lose

  Example
  Say the full amount we have invested is £1000
  £1000 / 5 markets would be £200 available each

  Say we allowed only 25% as a percentage of loss for each market
  So it woud £200 * 0.25 = £50 as availableloss

  so availableLoss = lib.toNumber((available / markets.length) * percRiskLoss);

  */

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

//let limitDistanceOffset = lib.toNumber(priceDiff4Hours * market.limitDistancePerc);
let cp = trend == 'bullish' ? lastCloseAsk : lastCloseBid;
let limitDistanceOffset = await actions.calculateOffset('limitDistancePerc',cp);


//This calculation arrives to the same values as the logic above
//It essentially does everything in one line, calculating the difference while adding/substracting the distance depending on whether it is limit or stop
//OLD
//limitDistance = lib.toNumber((lastCloseAsk - (lastCloseBid + limitDistanceOffset)),'abs');

let maxLimitDistance = (maxLimit / market.size);

if(trend == 'bullish') limitDistanceLevel = lib.toNumber(( cp + limitDistanceOffset), 'abs');
if(trend == 'bearish') limitDistanceLevel = lib.toNumber(( cp - limitDistanceOffset), 'abs');

limitDistance = lib.toNumber((cp - limitDistanceLevel), 'abs');

//  let potentialProfitAmount = limitDistance * market.size;
//
// if(potentialProfitAmount >= maxLimit){
//   //console.log('potentialProfitAmount greater than or equal to maxLimit, using maxLimitDistance based on maximum limit.');
//   limitDistance = maxLimitDistance;
// }

}

/*

CALCULATE OFFSET FOR LIMIT OR STOP AREA

*/

//Here we calculate the minimum stop and ensure the stop distance isnt less than this otherwise we get an ORDER LEVEL ERROR

actions.calculateOffset =  async function(offset,cp){

  let minStop = market.minimumStop;

  console.log('minimum stop info:');
  console.log(market.minimumStop);

  let minStopVal = lib.toNumber(market.minimumStop.value); //by default type is assumed points
  //if minimum stop is percentage, convert this to points
  console.log('minStopVal: ' + minStopVal);



  if(market.minimumStop.type == 'percentage') minStopVal = lib.toNumber(cp * (minStopVal/100));

  let off = lib.toNumber(priceDiff4Hours * market[offset]);

  //if stop offset is less than minimum points, get minimum difference and double it as an offset
  if(off < minStopVal){
    console.log('offset less than minStopVal');
    let minDiff = lib.toNumber((minStopVal - off), 'abs');
    off = lib.toNumber(off + (minDiff * 2));
  }

  return off;
}

/*

FINAL ANALYSIS

*/

// actions.finalAnalysis = async function(){
//   analysis = {
//     'pricedata':pricedata,
//     'firstClose': firstClose,
//     'beforeRangeFirstClose': beforeRangeFirstClose,
//     'firstDiff': firstDiff,
//     'lastTime': lastTime,
//     'lastOpen' : lastOpen,
//     'lastClose': lastClose,
//     'lastCloseAsk': lastCloseAsk,
//     'lastCloseBid': lastCloseBid,
//     'lastHigh': lastHigh,
//     'lastLow': lastLow,
//     'lastDiff': lastDiff,
//     'lineData': lineData,
//     'lineDistance': lineDistance,
//     'previousTrend' : previousTrend,
//     'trend4Hours':trend4Hours,
//     'trend4HoursDiff':trend4HoursDiff,
//     'trend4HoursDiffPerc':trend4HoursDiffPerc,
//     'first4HoursClose':first4HoursClose,
//     'last4HoursClose':last4HoursClose,
//     'highest4HourPrice': highest4HourPrice,
//     'lowest4HourPrice': lowest4HourPrice,
//     'priceDiff4Hours': priceDiff4Hours,
//     'is4HoursTrendOveride': is4HoursTrendOveride,
//     'is4HoursNotRanging':check14,
//     'trend': currenttrend,
//     'trendDiff': trendDiff,
//     'trendDiffPerc': (trendDiffPerc*100) + '% ('+trendDiffPerc+')',
//     'beforeRangeTrend': beforeRangeTrend,
//     'beforeRangeFirstCloseData' : beforeRangeFirstCloseData,
//     'beforeRangeTrendDiff': beforeRangeTrendDiff,
//     'beforeRangeTrendDiffPerc': beforeRangeTrendDiffPerc,
//     'rangedata_indexes': rangeData.support.prices_idx,
//     'lastRangeData': pricedata2.support[rangeData.support.prices_idx[rangeData.support.prices_idx.length -1]],
//     'recentrange': recentrange,
//     'rangeConfirmations':rangeConfirmations,
//     'recentTrendArr': recenttrendArr,
//     'recentTrend': recenttrend,
//     'recentUps': ups,
//     'recentDowns':downs,
//     'recentMovementValue': movementValue,
//     'recentMovementValueDiffPerc': movementValueDiffPerc + '%',
//     //'isLastDiffGreaterThanMomentumLines': check1,
//     'isRangeAreaGood':check0,
//     'isRangeConfirmationsGreaterThanLimit': check2,
//     'isRecentRangeOverLimit': recentrange.length >= recentrangelimit,
//     'recentRangeIndex21': recentrange.indexOf(21),
//     'recentRangeIndex22': recentrange.indexOf(22),
//     'recentRangeIndex23': recentrange.indexOf(23),
//     'updatedtrend': trend,
//     //'islastCloseAboveBelowLines': check5,
//     'isRecentTrendSameAsTrend': check6,
//     'isBeforeRangeSameAsTrend': check7,
//     'isBeforeRangeTrendNotBroken' : check13,
//     //'isRecentTrendBreaking' : isRecentTrendBreaking,
//     'isBreakingThroughRange': check8,
//     'isWithinTradeThreshold': check9,
//     'isNoVolatileGap': check10,
//     'volatilityGapAnalysis': volatilityGapAnalysis,
//     'totalMissingHours': totalMissingHours,
//     'noBumpInRange': check11,
//     'bumps': rangeData.bumps,
//     'bumpgroupcount': bumpgroupcount,
//     'waves': rangeData.wavecount,
//     'wavePoints':rangeData.waves.length,
//     'enoughWaves':check15,
//     'notTradedBefore': check12,
//     'lastTimeTraded': market.tradedBefore !== false ? moment(market.tradedBefore).format('LLL') : false,
//     'tradedBeforeHoursDiff': market.tradedBefore !== false ? moment().diff(moment(market.tradedBefore).valueOf(), "hours") : false,
//     'beforeRangeOveridden': beforeRangeOveridden,
//     'lastBeforeRangeTrendMovement': bRD.lastBeforeRangeTrendMovement,
//     'lastBeforeRangeTrendMovementClose': bRD.lastBeforeRangeTrendMovementClose,
//     'lastBeforeRangeTrendMovementTime': bRD.lastBeforeRangeTrendMovementTime,
//     'lastBeforeRangeTrendMovementDiff': bRD.lastBeforeRangeTrendMovementDiff,
//     'lastBeforeRangeTrendMovementPerc': bRD.lastBeforeRangeTrendMovementPerc,
//     'momentumLimit': momentumLimit,
//     'rangeLimit': rangelimit,
//     'tradeLimit': tradelimit,
//     'lineDistanceLimit': linedistancelimit,
//     'priceDiff': priceDiff,
//     'stopDistance': stopDistance,
//     'stopDistanceLevel': stopDistanceLevel,
//     'limitDistance': limitDistance,
//     'limitDistanceLevel': limitDistanceLevel,
//     'ticket': lib.isEmpty(market.deal) == false ? market.deal : {}
//   };




  actions.finalAnalysis = async function(){
    analysis = {
      'pricedata':pricedata,
      'rangePriceDataLength':pricedata2.support.length,
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
      'nolastPriceVolatile': checks.___nolastPriceVolatile.is,
      'lineData': lineData,
      'lineDistance': lineDistance,
      'previousTrend' : previousTrend,
      'midtrend4Hours':midtrend4Hours,
      'midtrend4HoursDiffPerc': midtrend4HoursDiffPerc,
      'midClose': mid4HoursClose,
      'midTime': times4[Math.round(times4.length / 2)],
      'isMidTrendOveride': isMidTrendOveride,
      'prevtrend4Hours' : prevtrend4Hours,
      'trend4Hours':trend4Hours,
      'trend4HoursDiff':trend4HoursDiff,
      'trend4HoursDiffPerc':trend4HoursDiffPerc,
      'first4HoursClose':first4HoursClose,
      'last4HoursClose':last4HoursClose,
      'highest4HourPrice': highest4HourPrice,
      'lowest4HourPrice': lowest4HourPrice,
      'priceDiff4Hours': priceDiff4Hours,
      'is4HoursTrendOveride': is4HoursTrendOveride,
      'is4HoursNotRanging':checks.___4HoursNotRanging.is,
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
      'isRangeAreaGood':checks.___rangeAreaGood.is,
      //'isRangeNotTrend':checks.___rangeNotTrend.is,
      'isRangeConfirmationsGreaterThanLimit': checks.___rangeConfirmationsGreaterThanLimit.is,
      'isRecentRangeOverLimit': recentrange.length >= recentrangelimit,
      'recentRangeIndex20': recentrange.indexOf(20),
      'recentRangeIndex21': recentrange.indexOf(21),
      'recentRangeIndex22': recentrange.indexOf(22),
      'recentRangeIndex23': recentrange.indexOf(23),
      'updatedtrend': trend,
      'islastCloseAboveBelowLines': checks.___lastCloseAboveBelowLines.is,
      'isRecentTrendPivoting': checks.___recentTrendPivoting.is,
      'isRecentTrendSameAsTrend': checks.___recentTrendSameAsTrend.is,
      'isBeforeRangeSameAsTrend': checks.___beforeRangeSameAsTrend.is,
      'isBeforeRangeTrendNotBroken' : checks.___beforeRangeTrendNotBroken.is,
      'isBeforeRangeSameAs4HourTrend' : checks.___beforeRangeSameAs4HourTrend.is,
      'isRecentTrendSameAs4HourTrend' : checks.___recentTrendSameAs4HourTrend.is,
      //'isRecentTrendBreaking' : isRecentTrendBreaking,
      'isBreakingThroughRange': checks.___breakingThroughRange.is,
      'isWithinTradeThreshold': checks.___withinTradeThreshold.is,
      'isNoVolatileGap': checks.___noVolatileGap.is,
      'volatilityGapAnalysis': volatilityGapAnalysis,
      'totalMissingHours': totalMissingHours,
      'noBumpInRange': checks.___noBumpInRange.is,
      'bumps': rangeData.bumps,
      'bumpgroupcount': bumpgroupcount,
      'bumpVolatilityData': {
        'bumpVolatilityPerc': bumpVolatilityPerc,
        'bumpVolatilityDiff' : bumpVolatilityDiff,
        'bumpVolatilityIndex': bumpVolatilityIndex
      },
      'isNoBumpVolatility': checks.___noBumpVolatility.is,
      'waves': lib.isDefined(rangeData, 'wavecount') ? rangeData.wavecount : 'none',
      'wavePoints':lib.isDefined(rangeData, 'waves') ? rangeData.waves.length : 'none',
      'isWaveOveride': isWaveOveride,
      'primariesLength': lib.isDefined(rangeData, 'primaries') ? rangeData.primaries.length : 'none',
      //'primaries': lib.isDefined(rangeData, 'primaries') ? rangeData.primaries : 'none',
      'confirmations':trend4Hours !== 'ranging' && !lib.isEmpty(confirmationData.confirmationPoints) ? confirmationData.confirmationPoints.x.length : 'none',
      //'confirmationData':trend4Hours !== 'ranging' ? confirmationData : 'none',
      //'confirmationWaves': trend4Hours !== 'ranging' ? confirmationData.waves : 'none',
      //'confirmationTrendPoints': trend4Hours !== 'ranging' ? confirmationData.trendPoints.y : 'none',
      //'confirmationPoints': trend4Hours !== 'ranging' ? confirmationData.confirmationPoints.y : 'none',
      'isEnoughConfirmations':checks.___enoughConfirmations.is,
      'enoughWaves':checks.___enoughWaves.is,
      'notTradedBefore': checks.___notTradedBefore.is,
      'tradedBeforeTimestamp': market.tradedBefore,
      'lastTimeTraded': market.tradedBefore !== false ? moment.utc(market.tradedBefore).local().format('LLL') : false,
      'tradedBeforeHoursDiff': market.tradedBefore !== false ? moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours") : false,
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
      'ticket': lib.isEmpty(market.deal) == false ? market.deal : {},
      'isDeal' : isDeal,
      'availableLoss': availableLoss,
      'falseChecks' : falseChecks,
      'trueChecks' : trueChecks,
      'marketClosed': market.marketClosed
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
