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

  //run through and check any open positions
  console.log('Checking open positions');
  await api.showOpenPositions().then(async positionsData => {
        //console.log(util.inspect(positionsData, false, null));
        if(positionsData.positions.length > 0){
         //Loop through any open trades and begin monitoring
         for (const [i, td] of positionsData.positions.entries()) {
           console.log(td);
           epic = td.market.epic;
           dealId = td.position.dealId;
           dealRef = td.position.dealReference;
           direction = td.position.direction;
           t = td;
           core.actions.setPaths();
           await monitor.iniMonitor(dealId,dealRef,epic);


           if(i == (positionsData.positions.length-1)){
             console.log('Finished looping through open positions');
             //run through any deals which aren't empty on market data

             //console.log('========MONITORS:');
             //console.log(monitors);

             console.log('Checking deals on market data');
             for (const [i, m] of markets.entries()) {
               mid = i;
               market = markets[mid];
               epic = m.epic;
               const tradeDataDir_tmp = 'core/data/'+epic+'/'+epic+'_tradedata.json';
               trades = await cloud.getFile(tradeDataDir_tmp);
               await actions.checkOpenTrade();
             }

           }
         }
       }
  }).catch(e => console.log('catch error: showOpenPositions: ' + e));


}


/*

CHECK MARKET CLOSED

*/

actions.checkMarketStatus = async function(epic){
  return new Promise(async (resolve, reject) => {
    let epics = [epic];
    await api.epicDetails(epics).then(r => {
        resolve(r.marketDetails[0].snapshot.marketStatus);
      }).catch(e => console.log(e));
  });
}


/*

FIX DEAL ID

This methods checks for missing dealId and matches using openDateUtc and openLevel value, where dealId is not the same

*/

actions.checkIncorrectDeal = async function(dealId){
  return new Promise(async (resolve, reject) => {

    let from = undefined;
    let to = undefined;
    let detailed = true;
    let pageSize = 50;
    let openLevel = null;
    let openDate = null;
    let positionFound = false;
    let name = null;
    let dealUpdated = false;
    let type = 'ALL_DEAL';

    await api.acctActivity(from, to, detailed, dealId, pageSize).then(r => {
      console.log(util.inspect(r,false,null));
      if(r.activities.length){
        r.activities.forEach(activity => {
          if(activity.dealId == dealId){
            console.log(activity);
            openLevel = activity.details.level;
            openDate = activity.date;
            name = activity.instrumentName;
            positionFound = true;
          }
        });
      } else {
        reject(dealUpdated);
      }
    }).catch(e => reject(e));

    if(positionFound){

      await api.acctTransaction(type,from, to, pageSize,1).then(r => {
        console.log(util.inspect(r,false,null));
        let transactions = r.transactions;
        transactions.forEach(transaction =>{
          if(transaction.openLevel == openLevel && transaction.instrumentName == name){
            console.log('matching position found with different ID, updating...');
            market.deal.dealId = transaction.reference;
            dealUpdated = true;
            resolve(dealUpdated);
          } else {
            reject(dealUpdated);
          }
        });
      }).catch(e => reject(e));

    } else {
      reject(dealUpdated);
    }
  });
}


/*

CHECK OPEN TRADES

Checks for an open trade on a specific market.
This runs every hour and starts monitoring if it wasnt already.
This is useful if monitoring stops because market is closed. But we need to restart monitoring when market opens, so every hour we check for this.

*/

actions.checkDeal = async function(){
  await api.showOpenPositions().then(async (positionsData) => {
    if(positionsData.positions.length){

      // positionsData.positions.forEach(async (td,i) => {
      //     if(td.position.epic == market.epic){
      //       console.log('Found open deal on IG server with epic: ' + market.epic);
      //       const dealId = td.position.dealId;
      //       if(lib.isEmpty(market.deal)) {
      //         console.log('Deal is empty on market data, re-adding...');
      //         trades.forEach(td2 =>{
      //           if(td2.dealId == dealId){
      //             console.log('Found deal.');
      //             market.deal = lib.deepCopy(td2.deal);
      //             //after adding missing deal, re-run checkOpenTrade
      //             actions.checkOpenTrade();
      //           }
      //         });
      //       } else {
      //         console.log('Deal on market data is not empty. continue...')
      //       }
      //     } else {
      //       console.log('No open position found for epic: ' + market.epic);
      //     }
      // });

      let isPositionFound = false;
      let dId = null;
      let startDate = null;
      let dRef = null;
      let posDirection = null;
      for (const [i, td] of positionsData.positions.entries()) {
        if(td.market.epic == market.epic){
          dId = td.position.dealId;
          dRef = td.position.dealReference;
          posDirection = td.position.direction;
          startDate = td.position.createdDateUTC;

          isPositionFound = true;
        }
      }

      if(isPositionFound == true){
        console.log('Found open deal on IG server with epic: ' + market.epic);
        if(lib.isEmpty(market.deal)) {
          console.log('Deal is empty on market data, re-adding...');
          console.log(dId);

          let tradeFound = false;
          for (const [i, td2] of trades.entries()) {
            if(td2.dealId == dId){
              console.log('Found deal.');
              market.deal = lib.deepCopy(td2);
              tradeFound = true;
            }
          }

          if(tradeFound == false){
            console.log('No deal found on tradedata, creating one');
            let t = lib.deepCopy(trade);
            t.marketId = market.id;
            t.epic = market.epic;
            t.startAnalysis = {};
            t.start_timestamp = moment(startDate).valueOf();
            t.start_date = moment(startDate).format('LLL');
            t.dealId = dId;
            t.dealRef = dRef;
            t.direction = posDirection;
            market.deal = lib.deepCopy(t);
          }

          //after adding missing deal, re-run checkOpenTrade
          markets[mid] = market;
          await cloud.updateFile(markets,marketDataDir);
          await actions.checkOpenTrade();

        } else {
          console.log('Deal on market data is not empty. continue...')
        }
      } else {
          console.log('No position found for epic: ' + market.epic);
      }


    } else {
      console.log('No open positions found for any epic.');
    }
  }).catch(e => console.log(e));
}

/*

CHECK CLOSED TRADE

*/


actions.checkCloseTrade = async function(){

}

/*

CHECK OPEN TRADE

*/

actions.checkOpenTrade = async function(){
  console.log('-------------------------------------- BEGIN checking for open trades : ' + epic);
  //console.log(market.deal);
  if(lib.isEmpty(market.deal)) {
    console.log('Deal on market data is empty. Checking for open positions.');
    console.log('market epic: ' + epic);
    //console.log(markets[mid].deal);
    await actions.checkDeal();
  } else {
    //deal is in process for this market, get trade data
    console.log('Deal is logged, getting data:');
    dealId = market.deal.dealId;
    dealRef = market.deal.dealRef;
    console.log('dealId: ' + dealId);
    console.log('dealRef: ' + dealRef );

    if(dealId == 'undefined' || typeof dealId == 'undefined'){
      console.log('dealId is undefined. Position might be unconfirmed if dealId is undefined, checking for confirmed positions');
      await actions.checkDealId(dealRef).then(id => {
        dealId = id;
        console.log('got dealId: ' + dealId);
      }).catch(e => {
        console.log(e);
        return false;
      });
    }

    //Don't think this is necessary as this is already triggered in iniMonitor if position is not found
    // if(dealId.length && dealId !== 'undefined' && typeof dealId !== 'undefined'){
    //   await actions.checkIncorrectDeal(dealId).then(async r => {
    //     console.log('Found matching position with different dealId, dealID has been updated.');
    //     dealId = market.deal.dealId;
    //   }).catch(e => {
    //     console.log('Error checking for incorrect deal');
    //     console.log(e);
    //   });
    // }


    let isMonitoring = false;
    await api.getPosition(String(dealId)).then(async positionData => {
          //console.log(util.inspect(positionData, false, null));
          if(positionData.market.marketStatus !== 'CLOSED'){
            dealRef = positionData.position.dealReference;
            direction = positionData.position.direction;

            //console.log('-----MONITORS:');
            //console.log(monitors);

            monitors.forEach(monitor => {
              if(monitor.epic == epic) isMonitoring = true;
            });

            if(isMonitoring == false){
              console.log('Open trade wasnt monitoring, starting monitoring. dealRef: ' + dealRef + ' dealId: ' + dealId + ' epic: ' + epic);
              await monitor.iniMonitor(dealId, dealRef, epic);
            }

          }

    }).catch(async e => {

      console.log('Error finding position with dealId: ' + dealId);
      console.log(e);
      console.log('Deal is logged, but no position found. Position must have closed, cleaning up...');

      await api.acctTransaction('ALL_DEAL',undefined, undefined, 20,1).then(async r => {
        //console.log(util.inspect(r,false,null));
        let transactions = r.transactions;
        console.log('Looping through transactions..');
        console.log('DealId: ' + dealId);

        let isTransactionFound =  false;

        //TODO: There is an issue with the dates not being in sync by 1 hour, when a trade is made, the date is 1 hour behind
          //going by open levels for now

        let marketOpenLevel = market.deal.openLevel;
        let marketDealStartTime = moment(market.deal.start_timestamp).format('YYYYMDDh');
        console.log('market deal start: ' + marketDealStartTime);
        console.log('epic: ' + epic);

        transactions.forEach(transaction =>{

          let transactionOpenDate = moment(transaction.openDateUtc).format('YYYYMDDh');
          console.log('transaction open date: ' +  transactionOpenDate);
          console.log('transaction name: ' + transaction.instrumentName);
          console.log('transactionOpenDate: ' + transactionOpenDate);
          console.log('marketDealStartTime: ' + marketDealStartTime);
          console.log('market alias: ' + market.alias);
          console.log('marketopenLevel: ' + marketOpenLevel);
          console.log('transaction open level:' + transaction.openLevel )


          //https://jsfiddle.net/FLhpq/4/


          //if( market.alias == transaction.instrumentName && transactionOpenDate == marketDealStartTime ){
          if( market.alias == transaction.instrumentName && marketOpenLevel == transaction.openLevel ){

            isTransactionFound =  true;

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
              dealId: dealId,
              transactionDealId: transaction.reference
            }

            console.log(closeAnalysis);
            console.log('closing trade log...');

            log.closeTradeLog(market.epic, closeAnalysis);
            log.closeMonitorLog(market.epic);

          }
        });

        if(!isTransactionFound){
          console.log('No transaction for dealId: ' + dealId + 'found. Deal reference:  ' + dealRef);
          console.log('If no transaction is found, position must still be open. Sometimes getPosition can return an error even though there is an open position. Leaving for now.');
          market.deal = {};


          //Clear any monitoring if any
          //log.closeMonitorLog(market.epic);
          //await cloud.updateFile(markets,marketDataDir);

          // await actions.checkDealId(dealRef).then(id => {
          //   dealId = id;
          //   console.log('got dealId: ' + dealId);
          // }).catch(e => {
          //   console.log(e);
          //   return false;
          // });

        }

      }).catch(e => console.log(e));

      //markets[mid].deal = {};
      //log.closeMonitorLog(market.epic);
    });
  }

}

/*

CHECK DEAL ID

*/

actions.checkDealId = async function(ref){
  return new Promise(async (resolve, reject) => {
        console.log('checking for dealId with dealRef:' + ref);
        //note this only works for unconfirmed positions
        await api.confirmPosition(String(ref)).then(async r => {
          let id = r.affectedDeals.length  ? r.affectedDeals[0].dealId : r.dealId;
          console.log('returning dealId: ' + id);
          //console.log(util.inspect(r, false, null));
          resolve(id);
        }).catch(e => {
          console.log('could not confirm position with deal reference: ' +  ref);
          //console.log(e);
          reject(e);
        });
  });
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
  if((lineDistance >= linedistancelimit && lineDistance <= rangelimit) && (resistanceline > supportline)) checks.___rangeAreaGood.is = true;
}

/*

CHECK RANGE

*/

actions.checkRangeConfirmations = async function(){
  rangeConfirmations = rangeData.support.prices_idx.length;
  if(rangeConfirmations >= rangeConfirmationLimit) checks.___rangeConfirmationsGreaterThanLimit.is = true;
}

/*

FINAL CHECKS

*/

actions.finalChecks = async function(){


   //if trend is currently ranging, this would suggest that the market is breaking through range, so set trend as the same
  isRecentTrendBreaking = false;
  currenttrend = trend; //store a copy of trend before (if) changing it for analysis
  //if(recenttrend !== 'ranging' && (movementValueDiff >= (rangelimit/2)) && trend == 'ranging'){


  //range index start needs to be over 6, so there is evidence of some trend before
  //trendDiffPerc must also be on or over 1%

  //if(recenttrend !== 'ranging' && (movementValueDiffPerc >= momentLimitPerc) && trend == 'ranging' && rangeData.support.prices_idx[0] >= 6 && (trendDiffPerc >= 1 || beforeRangeTrendDiffPerc >= 1)){
  if(recenttrend !== 'ranging' && (movementValueDiffPerc >= momentLimitPerc) && trend == 'ranging' && (trendDiffPerc >= 1 || beforeRangeTrendDiffPerc >= 1)){
    trend = recenttrend;
    isRecentTrendBreaking = true;
  }

  //Possible addition of check5
  //this checks to ensure last price bar is either above support/resistance depending on trend
  //eg. you wouldn't want last price bar to bearish, matching with initial direction but far above resistance line, which would actually suggest it was bullish overall
  // if(lastClose < supportline && lastClose < resistanceline) check5 = true;
  // if(lastClose > supportline && lastClose > resistanceline) check5 = true;

  //if number of range confirmations is over limit
  //if price bar is within horizontal lines
  //if range confirmations are recent and over count limit
  //then trend and recenttrend should overidden to be ranging
  // if(check5 == false && check2 == true && recentrange.length >= recentrangelimit){
  //   trend = 'ranging';
  //   recenttrend = 'ranging';
  //   isRecentTrendBreaking = false;
  // }




  if(trend == recenttrend) checks.___recentTrendSameAsTrend.is = true;
  if(trend == beforeRangeTrend) checks.___beforeRangeSameAsTrend.is = true;
  // if((previousTrend == 'ranging' || (check2 == true && recentrange.length >= recentrangelimit)) && (recentrange.indexOf(21) !== -1 || recentrange.indexOf(22) !== -1 || recentrange.indexOf(23) !== -1) && trend !== 'ranging'){
  //   check8 = true;
  // }

  //Using 4 hour trend as new benchmark of trend
  //Also using number of waves to confirm ranging (needs to be more than 1)
  //And predicting that if the recent trend is in opposite direction of trend, the market will pivot


  if(beforeRangeTrend == trend4Hours && currenttrend == 'ranging'){
      trend = trend4Hours;
  }

  let trendBenchmark = ((trend == 'ranging' || (trend == trend4Hours)) && trend4Hours !== 'ranging');
  let isPivoting = (recenttrend !== 'ranging' && recenttrend !== trend4Hours);
  let enoughWaves = (rangeData.waves.length >= 4);
  if(trendBenchmark && enoughWaves && isPivoting ) {
    trend = trend4Hours;
    recenttrend = trend4Hours;
    beforeRangeTrend = trend4Hours;
    isRecentTrendBreaking = true;
    is4HoursTrendOveride = true;
  }



  // if((previousTrend == 'ranging' || (check2 == true && recentrange.length >= recentrangelimit)) && (recentrange.indexOf(21) !== -1 || recentrange.indexOf(22) !== -1 || recentrange.indexOf(23) !== -1) && trend !== 'ranging'){
  //   check8 = true;
  // }

  if((previousTrend == 'ranging' || (checks.___rangeConfirmationsGreaterThanLimit.is == true && recentrange.length >= recentrangelimit)) && (recentrange.indexOf(21) !== -1 || recentrange.indexOf(22) !== -1 || recentrange.indexOf(23) !== -1) && trend !== 'ranging'){
    checks.___breakingThroughRange.is = true;
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

  lineData.momentumLimitBuyLine = momentumLimitBuyLine;
  lineData.momentumLimitSellLine = momentumLimitSellLine;
  lineData.tradeLimitBuyLine = tradeLimitBuyLine;
  lineData.tradeLimitSellLine = tradeLimitSellLine;

  // if(trend == 'bullish' && (lastClose >= momentumLimitBuyLine || lastHigh >= momentumLimitBuyLine)) check1 = true;
  // if(trend == 'bearish' && (lastClose <= momentumLimitSellLine || lastLow <=  momentumLimitSellLine)) check1 = true;


  //trade threshold check - If the price goes in the right direction, but way beyond expected area of profit (a sudden significant ride or drop). if this happens, it can take longer to recover and usually moves in the opposite direction afterward
  //if(trend == 'bullish' && (Math.abs(lastClose - resistanceline) >= tradelimit)) check9 = false;
  //if(trend == 'bearish' && (Math.abs(lastClose - supportline) >= tradelimit)) check9 = false;

  if(trend == 'bullish' && lastClose > tradeLimitBuyLine) checks.___withinTradeThreshold.is = false;
  if(trend == 'bearish' && lastClose < tradeLimitSellLine) checks.___withinTradeThreshold.is = false;

  //if(Math.abs(lastClose - lastOpen) >= tradelimit) check9 = false;
  checks.___noVolatileGap.is = isNoVolatileGap;
  //if a number of checks are passed, we overide beforeRangeTrend and pass only if lastBeforeRangeMovement is also the same as trend
  //lastBeforeRangeMovement only holds 'bullish' or 'bearish' when last recorded as beforeRangeTrend
  //this is to capture longer ranging staircase patterns, where the beforeRangeTrend might be outside number of hours we set as parameter
  beforeRangeOveridden = false;
  bRD.lastBeforeRangeTrendMovementDiff = parseFloat(Math.abs(bRD.lastBeforeRangeTrendMovementClose - lastClose).toFixed(2));
  // if(beforeRangeTrend == 'ranging' && trend == bRD.lastBeforeRangeTrendMovement && check8 == true && check5 == true && bRD.lastBeforeRangeTrendMovementDiff >= (rangelimit/2)) {
  //   check7 = true;
  //   beforeRangeOveridden = true;
  // }


  if(beforeRangeTrend == 'ranging' && trend == bRD.lastBeforeRangeTrendMovement && checks.___breakingThroughRange.is == true && bRD.lastBeforeRangeTrendMovementDiff >= (rangelimit/2)) {
    checks.___beforeRangeSameAsTrend.is = true;
    beforeRangeOveridden = true;
  }
  if(rangeData.bumps.length > 0 && bumpgroupcount >= bumpgrouplimit) checks.___noBumpInRange.is = false;

  //ensure last time traded is 3 hours or more
  tradebeforeCheck = market.tradedBefore !== false ? moment().diff(moment(market.tradedBefore).valueOf(), "hours") >= tradeBeforeHours ? true : false : true;


  checks.___notTradedBefore.is = tradebeforeCheck;

  checks.___beforeRangeTrendNotBroken.is = isBeforeRangeTrendNotBroken;

  checks.___4HoursNotRanging.is = (trend4Hours !== 'ranging');

  //if there are not enough waves dont allow
  checks.___enoughWaves.is = enoughWaves;
  checks.___enoughWaves.value = rangeData.waves.length;


  //check for confirmations
  checks.___enoughConfirmations.is = confirmationData.confirmationPoints.y.length >= 2;


  //collate which checks are false and true, any which are false prevents deal being made
  Object.keys(checks).forEach(check =>{
    let c = { [check] : checks[check] };

    if(checks[check].is == false) {
      falseChecks.push(c);
      isDeal = false;
    }else {
      trueChecks.push(c);
    }
  });



}

module.exports = {
  actions: actions
}
