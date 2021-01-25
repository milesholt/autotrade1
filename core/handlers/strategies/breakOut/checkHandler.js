var actions = {};
var core;
var api;
var monitor;
var util;
var cloud;
var lib;
var log;
var moment;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  api = core.api;
  util = core.util;
  monitor = core.monitor.actions;
  cloud = core.cloudHandler.actions;
  lib = core.lib.actions;
  log = core.log.actions;
  moment = core.moment;
}

/*

CHECK OPEN TRADES

*/

actions.checkOpenTrades = async function(){
  let t = {};
  let l = true;
  await api.showOpenPositions().then(async positionsData => {
        console.log(util.inspect(positionsData, false, null));
        if(positionsData.positions.length > 0){
         //Loop through any open trades and begin monitoring
         positionsData.positions.forEach(trade => {
           console.log(trade);
           epic = trade.market.epic;
           dealId = trade.position.dealId;
           dealRef = trade.position.dealReference;
           direction = trade.position.direction;
           t = trade;
           core.actions.setPaths();
           monitor.iniMonitor(dealId,dealRef,epic);
         });
       }
  }).catch(e => console.log('catch error: showOpenPositions: ' + e));
}


/*

CHECK OPEN TRADES

Checks for an open trade on a specific market.
This runs every hour and starts monitoring if it wasnt already.
This is useful if monitoring stops because market is closed. But we need to restart monitoring when market opens, so every hour we check for this.

*/

actions.checkOpenTrade = async function(){
  console.log('checking for open trades');
  console.log(market.deal);
  if(!lib.isEmpty(market.deal)) {
    //deal is in process for this market, get trade data
    console.log('Deal is logged, getting data:');
    dealId = market.deal.dealId;
    dealRef = market.deal.dealRef;
    console.log(dealId);
    console.log('dealRef: ' + dealRef );

    let isMonitoring = false;
    await api.getPosition(String(dealId)).then(async positionData => {
          console.log(util.inspect(positionData, false, null));
          if(positionData.market.marketStatus !== 'CLOSED'){
            dealRef = positionData.position.dealReference;
            direction = positionData.position.direction;
            monitors.forEach(monitor => {
              if(monitor.epic == epic) isMonitoring = true;
            });
            if(isMonitoring == false){
              console.log('Open trade wasnt monitoring, starting monitoring. dealId: ' + dealId + ' epic: ' + epic);
              monitor.iniMonitor(dealId, dealRef, epic);
            }
          }
    }).catch(async e => {
      console.log('Deal is logged, but no position found. Position must have closed, cleaning up...');

      await api.acctTransaction('ALL_DEAL',undefined, undefined, 50,1).then(r => {
        //console.log(util.inspect(r,false,null));
        let transactions = r.transactions;
        transactions.forEach(transaction =>{
          if(transaction.reference == dealId){
            console.log('dealId found and position has been closed on IG server. Cleaning up and closing position.');

            let closeAnalysis = {
              timestamp: moment(transaction.dateUTC).valueOf(),
              date: moment(transaction.dateUTC).format('LLL'),
              lastClose: transaction.closeLevel,
              direction: transaction.size.indexOf('+') !== -1 ? 'BUY': 'SELL',
              openLevel: transaction.openLevel,
              amount: lib.toNumber(transaction.profitAndLoss.split('£')[1]),
              result: transaction.profitAndLoss.indexOf('-') !== -1 ? 'LOSS' : 'PROFIT',
              data: 'NO DATA',
              dealId: dealId
            }

            console.log(closeAnalysis);
            console.log('closing trade log...');

            log.closeTradeLog(market.epic, closeAnalysis);

          }
        });
      }).catch(e => console.log(e));

      markets[mid].deal = {};
      log.closeMonitorLog(market.epic);
    });
  }

}


/*

CONFIG LIMITS

*/

actions.configLimits = async function(){
  momentumLimit = lib.toNumber(priceDiff * momentLimitPerc);
  rangelimit = lib.toNumber(priceDiff * rangeLimitPerc);
  tradelimit = lib.toNumber(priceDiff * tradeLimitPerc);
  linedistancelimit = lib.toNumber(priceDiff * lineDistanceLimitPerc);
  console.log('momentumLimit: ' + momentumLimit);
  console.log('tradeLimit: ' + momentumLimit);
  console.log('lineDistanceLimit: ' + linedistancelimit);
}


/*

CHECK LINES

*/

actions.checkLines = async function(){
  lineDistance = parseFloat(Math.abs(resistanceline - supportline).toFixed(2));
  console.log('lineDistance: ' + lineDistance);
  if((lineDistance >= linedistancelimit && lineDistance <= rangelimit) && (resistanceline > supportline)) check0 = true;
}

/*

CHECK RANGE

*/

actions.checkRangeConfirmations = async function(){
  rangeConfirmations = rangeData.support.prices_idx.length;
  if(rangeConfirmations >= rangeConfirmationLimit) check2 = true;
}

/*

FINAL CHECKS

*/

actions.finalChecks = async function(){


   //if trend is currently ranging, this would suggest that the market is breaking through range, so set trend as the same
  isRecentTrendBreaking = false;
  currenttrend = trend; //store a copy of trend before (if) changing it for analysis
  //if(recenttrend !== 'ranging' && (movementValueDiff >= (rangelimit/2)) && trend == 'ranging'){
  if(recenttrend !== 'ranging' && (movementValueDiffPerc >= momentLimitPerc) && trend == 'ranging'){
    trend = recenttrend;
    isRecentTrendBreaking = true;
  }

  //Possible addition of check5
  //this checks to ensure last price bar is either above support/resistance depending on trend
  //eg. you wouldn't want last price bar to bearish, matching with initial direction but far above resistance line, which would actually suggest it was bullish overall
  if(lastClose < supportline && lastClose < resistanceline) check5 = true;
  if(lastClose > supportline && lastClose > resistanceline) check5 = true;

  //if number of range confirmations is over limit
  //if price bar is within horizontal lines
  //if range confirmations are recent and over count limit
  //then trend and recenttrend should overidden to be ranging
  if(check5 == false && check2 == true && recentrange.length >= recentrangelimit){
    trend = 'ranging';
    recenttrend = 'ranging';
    isRecentTrendBreaking = false;
  }

  if(trend == recenttrend) check6 = true;
  if(trend == beforeRangeTrend) check7 = true;
  if((previousTrend == 'ranging' || (check2 == true && recentrange.length >= recentrangelimit)) && (recentrange.indexOf(22) !== -1 || recentrange.indexOf(23) !== -1) && trend !== 'ranging'){
    check8 = true;
  }

  //lastDiff is how much by percentage the lastClose is above/below resistance/support lines
  //if(lastDiff > momentumLimit) check1 = true;

  //Updated version for check1

  let momentumLimitBuyLine = lib.toNumber((resistanceline + momentumLimit),'abs');
  let momentumLimitSellLine = lib.toNumber((supportline - momentumLimit), 'abs');
  let tradeLimitBuyLine = lib.toNumber((resistanceline + tradelimit),'abs');
  let tradeLimitSellLine = lib.toNumber((supportline - tradelimit),'abs');

  console.log('trend: ' + trend);
  console.log('lastClose: ' + lastClose);
  console.log('momentumLimitBuyLine: ' + momentumLimitBuyLine);
  console.log('momentumLimitSellLine: ' + momentumLimitSellLine);
  console.log('tradeLimitBuyLine: ' + tradeLimitBuyLine);
  console.log('tradeLimitSellLine: ' + tradeLimitSellLine);

  if(trend == 'bullish' && lastClose >= momentumLimitBuyLine) check1 = true;
  if(trend == 'bearish' && lastClose <= momentumLimitSellLine) check1 = true;


  //trade threshold check - If the price goes in the right direction, but way beyond expected area of profit (a sudden significant ride or drop). if this happens, it can take longer to recover and usually moves in the opposite direction afterward
  //if(trend == 'bullish' && (Math.abs(lastClose - resistanceline) >= tradelimit)) check9 = false;
  //if(trend == 'bearish' && (Math.abs(lastClose - supportline) >= tradelimit)) check9 = false;

  if(trend == 'bullish' && lastClose >= tradeLimitBuyLine) check9 = false;
  if(trend == 'bearish' && lastClose <= tradeLimitSellLine) check9 = false;

  //if(Math.abs(lastClose - lastOpen) >= tradelimit) check9 = false;
  check10 = isNoVolatileGap;
  //if a number of checks are passed, we overide beforeRangeTrend and pass only if lastBeforeRangeMovement is also the same as trend
  //lastBeforeRangeMovement only holds 'bullish' or 'bearish' when last recorded as beforeRangeTrend
  //this is to capture longer ranging staircase patterns, where the beforeRangeTrend might be outside number of hours we set as parameter
  beforeRangeOveridden = false;
  bRD.lastBeforeRangeTrendMovementDiff = parseFloat(Math.abs(bRD.lastBeforeRangeTrendMovementClose - lastClose).toFixed(2));
  if(beforeRangeTrend == 'ranging' && trend == bRD.lastBeforeRangeTrendMovement && check8 == true && check5 == true && bRD.lastBeforeRangeTrendMovementDiff >= (rangelimit/2)) {
    check7 = true;
    beforeRangeOveridden = true;
  }
  if(rangeData.bumps.length > 0 && bumpgroupcount >= bumpgrouplimit) check11 = false;
  if(markets[mid].tradedbefore == true) check12 = false;
}

module.exports = {
  actions: actions
}
