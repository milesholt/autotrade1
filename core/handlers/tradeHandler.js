var actions = {};
var core;
var loop;
var notification;
var api;
var monitor;
var util;
var log;
var lib;
var error;
var moment;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  loop = core.loopHandler.actions.loop;
  notification = core.notificationHandler.actions;
  log = core.log.actions;
  api = core.api;
  monitor = core.monitor.actions;
  lib =  core.lib.actions;
  error = core.errorHandler.actions;
  util =  core.util;
  moment =  core.moment;
  strategy2 = core.strategy2Handler2;
}


/*

DETERMINE TRADE

*/

actions.determineTrade = async function(){

  let day = moment.utc().local().format('ddd');
  if( day == 'Sat' || day == 'Sun'){
    console.log('Should be the weekend. Day is: ' + day);
    console.log('Not beginning trade because it is the weekend and markets will be closed.');
    isDeal = false;
    return false;
  }
  
 //Dont allow non streaming trades
  if(market.streamingPricesAvailable == false) {
      console.log('market:' + market + ' is non-streaming, not opening trade');
      isDeal = false;
  }

  //If all checks pass, begin trade
  //TODO: Move checks to specific strategy

  //const checks = [true];
  if(isDeal){

      console.log('All checks passed. Beginning trade...');

      //await notification.notify('trade-being-made', 'Trade is being made');

      //Check if we already have a position
      let positionOpen = false;

      if(!lib.isEmpty(market.deal)){
        let dealId = market.deal.dealId;
        await api.getPosition(String(dealId)).then(async positionData => {
          //Check status pre-existing dealId
          console.log('Found position currently open.');
          console.log(positionData);
          //If status is CLOSED, we can open a new position
          if(positionData.market.marketStatus !== 'CLOSED'){
            positionOpen = true;
            console.log('positionOpen should now be true: ' + positionOpen);
          }

          if(positionData.market.marketStatus == 'CLOSED'){
            console.log('Found open position but status is closed');
            market.deal = {};
          }
        }).catch(async e => {
          //API might fail to find position, go again
          //Check history for position
          //If still no position recorded, end exec and log issue
          await api.acctTransaction('ALL_DEAL', date2, date1, 20, 1).then(r => {
            r.transactions.forEach(transaction => {
              if(dealId === transaction.reference){
                //Deal found in transaction history. Clear position and continue with trade.
                console.log('deal is not empty, but no dealId found in transactions or as open position, resetting..');
                market.deal = {};
              }
            });
          }).catch(e => {
            //Problem getting transaction history. Ending exec
            //Handle error
            return false;
          });
        });
      }


      //Check for existing open tickets
      await api.showOpenPositions().then(async positionsData => {
            //console.log(util.inspect(positionsData, false, null));
            if(positionsData.positions.length > 0){
              positionsData.positions.forEach(position => {
                  if(position.market.epic == market.epic){
                    positionOpen = true;
                    if(lib.isEmpty(market.deal)){
                      console.log('Position found on server, but deal on marketdata is empty');

                    }
                  }
                });
              }
      }).catch(e => console.log(e));

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

        //When setting distances, if we are buying, we need to use the bid close price, and selling, use the ask close price
        //let cp = trend == 'bullish' ? lastCloseBid : lastCloseAsk;

        //UPDATE we get a percentage area of priceDiff for limit and stop rather than using lastClose values


        //let limitDistanceArea = parseFloat((priceDiff * limitDistancePerc).toFixed(2));
        //limitDistance = lib.toNumber((lastCloseAsk - (lastCloseBid + limitDistanceArea)),'abs');

        //let stopDistanceFluctuation = parseFloat((priceDiff * stopDistanceFluctuationPerc).toFixed(2));
        //let stopDistanceArea = parseFloat(((priceDiff * market.stopDistancePerc) + stopDistanceFluctuation).toFixed(2));

        //These calculations arrive to the same values as the logic above
        //It essentially does everything in one line, calculating the difference while adding/substracting the distance depending on whether it is limit or stop

        //let nl = parseFloat(Math.abs(lastCloseAsk - (lastCloseBid + limitDistance)).toFixed(2));
        //let ns = parseFloat(Math.abs(lastCloseAsk - (lastCloseBid - stopDistance)).toFixed(2));


        //stopDistance = lib.toNumber((lastCloseAsk - (lastCloseBid - stopDistanceArea)),'abs');

        //Handle if minimum stop is in points and check stopDistance isnt less than this
        // let minStop = market.minimumStop;
        // console.log(minStop);
        // if(minStop.type == 'points' && stopDistance <= minStop.value){
        //   console.log('stopDistance is less than minimum requirement, should be at least: ' + minStop.value + ' ' + minStop.type);
        //   console.log('stopDistance was: ' +  stopDistance);
        //   stopDistance = stopDistance + lib.toNumber((minStop.value - stopDistance + 2), 'abs');
        //   console.log('stopDistance now: ' + stopDistance);
        // }
        //
        // //Handle for percentage
        // const minStopVal = lib.toNumber((trend == 'bullish' ? lastCloseAsk : lastCloseBid) * minStop.value);
        // if(minStop.type == 'percentage' && stopDistance <= minStopVal ){
        //   console.log('stopDistance is less than minimum requirement, should be at least: ' + minStop.value + ' ' + minStop.type);
        //   console.log('Converted minimumStopVal form percentage: ' + minStopVal);
        //   console.log('stopDistance was: ' +  stopDistance);
        //   stopDistance = stopDistance + lib.toNumber((minStopVal - stopDistance + 2), 'abs');
        //   console.log('stopDistance now: ' + stopDistance);
        // }

        //new Method for stopDistance
        //get stopDistance % of priceDiff
        //expand this from minimum Stop Distance points / percentage

        //let points = 0;


        //UPDATE: set offset to percentage of price diff, not fixed (5% of price diff as default)
        // let stopDistanceOffset = lib.toNumber(priceDiff * market.stopDistancePerc);
        // console.log(market.stopDistancePerc+'% of priceDiff is: ' + stopDistanceOffset + 'points' );
        //
        //
        // if(minStop.type == 'percentage') {
        //   //do for percentage
        //   let p= (market.stopDistancePerc + (minStop.value/100));
        //   stopDistanceOffset = lib.toNumber(priceDiff * p);
        // } else{
        //   //do for points
        //   points = (minStop.value + stopDistanceOffset);
        // }
        //
        // let stopDistanceLevel = 0
        // if(trend == 'bullish') stopDistanceLevel = lib.toNumber((cp - points), 'abs');
        // if(trend == 'bearish') stopDistanceLevel = lib.toNumber((cp + points), 'abs');
        //
        // stopDistance = points;
        //
        // console.log('test stop distance: ' + stopDistance);
        // console.log('test new stopDistance level: ' + stopDistanceLevel);


        //UPDATE2
        //Stop distance to be % of price diff, expanded from support/resistance line

        // let stopDistanceOffset = lib.toNumber(priceDiff * market.stopDistancePerc);
        //
        // if(trend == 'bullish') stopDistanceLevel = lib.toNumber(( lineData.support - stopDistanceOffset), 'abs');
        // if(trend == 'bearish') stopDistanceLevel = lib.toNumber(( lineData.resistance + stopDistanceOffset), 'abs');
        //
        // points = lib.toNumber((cp - stopDistanceLevel), 'abs');
        // stopDistance = points;


        let ticketError = false;

        //if(!positionOpen && positionsData.positions.length === 0){
        console.log('positionOpen before making trade: ' + positionOpen);

        let go = positionOpen == false && lib.isEmpty(market.deal) ? true : false;
        let dir = trend == 'bullish' ? 'BUY' : 'SELL';

        /* REPAIR COUNTER TRADE METHOD */

        //overide if possible trade is in opposite direction
        //close existing trade at loss and begin new trade in other direction
        let repairdelay = 0;
        if(!lib.isEmpty(market.deal)){
          if(dir !== market.deal.direction){
            console.log('new dir: ' + dir );
            console.log('current deal direction: ' + market.deal.direction);
            console.log('Closing open trade as loss, and beginning new one in other direction');
            go = true;
            markets[mid].closeloss = true;
            repairdelay = 20000; //wait 2 minutes for it to detect closeloss in stream, before starting a new one
          }
        }

        if(go === true){

          //No open positions, begin trade
          ticket = {
          	'currencyCode': 'GBP',
          	'direction': dir,
          	'epic': epic,
          	'expiry': market.expiry,
          	'size': size,
          	'forceOpen': true,
          	'orderType': 'MARKET',
          	'level': null,
          	'limitDistance':limitDistance,
          	'limitLevel': null,
          	'stopDistance': stopDistance,
          	'stopLevel': null,
          	'guaranteedStop': false,
          	'timeInForce': 'FILL_OR_KILL',
          	'trailingStop': null,
          	'trailingStopIncrement': null
          };


          console.log(ticket);

          analysis.ticket = ticket;
          //console.log(analysis);

              //Open a ticket
              await api.deal(ticket).then(async r => {
                //console.log(util.inspect(r, false, null));
                let ref = r.positions.dealReference;
                analysis.dealReference = ref;

                if(!r.confirms.dealId){
                  console.log('Error: ' + r.confirms.errorCode);

                  //let e = {'body': {'errorCode': r.confirms.errorCode, 'error': r, 'ticket' : ticket }};
                  //await error.handleErrors(e);

                  console.log('Checking again, and confirming position with deal ref: ' +  ref);
                  ticketError = true;

                  //Get status of position if error
                  await api.confirmPosition(ref).then(async rc => {
                    //console.log(util.inspect(rc, false, null));
                    //Check again as sometimes there's an error - not found - if it's still being processed

                    if(rc.dealStatus == 'ACCEPTED' && rc.reason == 'SUCCESS' && rc.status == 'OPEN'){
                      ticketError = false;
                      console.log('affectedDeals:');
                      console.log(rc.affectedDeals);
                      console.log('orig dealId:' + rc.dealId);
                      let id = rc.affectedDeals.length ? rc.affectedDeals[0].dealId : rc.dealId;
                      analysis.dealId = id;
                      analysis.openLevel =  rc.level;
                      console.log(r.confirms);
                      console.log('deal success, dealId should be:' + analysis.dealId);
                    }
                  }).catch(e => {
                    console.log('could not confirm position with deal reference: ' +  ref);
                    console.log(e);
                  });

                  if(ticketError){
                    //Send email
                    //Handle ticket error
                    analysis.errorInformation = rc;
                    await notification.notify('deal-ticket-error', analysis);
                  }
                } else {
                  //There can be a deal id but also an error, so check for errors again
                  await api.confirmPosition(ref).then(async rc => {
                    //console.log(util.inspect(rc, false, null));
                    //Check again as sometimes there's an error - not found - if it's still being processed
                    ticketError = true;
                    if(rc.dealStatus == 'ACCEPTED' && rc.reason == 'SUCCESS' && rc.status == 'OPEN'){
                      ticketError = false;
                      console.log('affectedDeals:');
                      console.log(rc.affectedDeals);
                      console.log('orig dealId:' + rc.dealId);
                      let id = rc.affectedDeals.length ? rc.affectedDeals[0].dealId : rc.dealId;
                      analysis.dealId = id;
                    } else if(rc.dealStatus == 'REJECTED'){
                      //Handle deal being rejected
                      //Send notification
                      analysis.errorInformation = rc;
                      await notification.notify('deal-rejected', analysis);
                      let e = {'body': {'errorCode': 'deal-rejected', 'error': rc }};
                      await error.handleErrors(e);
                     }
                  });
                }


              }).catch(e => {
                //Handle error creating ticket
                ticketError = true;
              });


              if(ticketError == false){
                  //Handle trade made successfully
                  //Send notification
                  await notification.notify('deal-success', analysis);
                  //Begin monitoring
                  //monitor.beginMonitor();

                  /*
                  when monitoring, because we are doing more than one
                  we have to assign the epic and dealId to the correct stream / monitor
                  So each monitor has to be associated with an ID or object, that contains the epic and dealId it is assigned with
                  There could be a monitors array, which contains the MID of whichever market is being monitored
                  */

                  console.log('Notification actioned. Beginning monitor and logging trade, dealId: ' + analysis.dealId);

                  //add a delay here if we are waiting for an existing trade to close (counter trade repair method)
                  setTimeout(async ()=>{
                    console.log('repairdelay: ' + repairdelay);
                    dealId = analysis.dealId;
                    dealRef = analysis.dealReference;
                    direction = analysis.ticket.direction;


                    //Log trade first before monitoring
                    await log.startTradeLog(epic, analysis, dealId);
                    await monitor.iniMonitor(dealId,dealRef,epic);
                  }, repairdelay );


                  market.tradedBefore = moment.utc().local().valueOf();
                  finalMessage = 'Checks passed and trade has been made. Will go again in 1 hour.';

               } else {

                  await log.errorTradeLog(analysis.errorInformation, analysis.dealReference);
                  finalMessage = 'Tried to make a trade, but it failed. Will go again in 1 hour.';

               }

        } else {
          //Handle already trading on position
          finalMessage = 'You are already trading on this epic. Waiting 1 hour.';

        };

  } else {
      //No trade, wait another hour

      //if more than enough hours has passed since last trade, reset tradedBefore to false
      // if(market.tradedBefore !== false){
      //   if(moment().diff(moment(market.tradedBefore).valueOf(), "hours") >= tradeBeforeHours){
      //      console.log(market.tradeBefore);
      //      console.log('Hour difference: ' +  moment().diff(moment(market.tradedBefore).valueOf(), "hours") );
      //      console.log('Resetting tradedBefore to false, as it is greater than tradedBeforeHours: ' + tradeBeforeHours);
      //
      //      market.tradedBefore = false;
      //   }
      // }
      finalMessage = 'Checks not passed. No trade. Waiting 1 hour.'

  }

}


/*

Determine if trade was near profit and now going in opposite direction

*/

actions.determineNearProfit = async function(){
  //Save from loss by deciding if it is close enough from newlimit, but on an opposite trend

  /*

  1) Is the price close enough to newlimit?
  2) Has a number of hours passed (12)
  3) Does the last number of hours show an opposing trend

  */
  let x = {};
  monitors.forEach(monitor =>{
     if(monitor.epic == epic) x = monitor;
  });

  if(!lib.isEmpty(x)){

  const dir = x.direction;

  const nearoffsetPerc = 0.05; //set near offset to 5%
  const hourspassed = 4;
  const priceDiffThreshold = 40;

  let closePrice = dir == 'BUY' ? lastCloseBid : lastCloseAsk;

  //Determine near offset  based on direction. If BUY, the offset is % below newlimit, if SELL offset is % above
  let nearoffset = dir == 'BUY' ? x.newLimit - (x.newLimit * nearoffsetPerc) : x.newLimit + (x.newLimit * nearoffsetPerc);

  //Determine pre close price (the close price a set number of hours before to determine trend)
  let preClosePrice = dir == 'BUY' ? pricedata3.support[pricedata3.support.length-hourspassed].closeBid : pricedata3.support[pricedata3.support.length-hourspassed].closeAsk;

  //Caluclate if preClosePrice is within nearoffset
  let isNearProfit = dir == 'BUY' ? preClosePrice >= nearoffset : preClosePrice <= nearoffset;

  //if preClosePrice was within offset and near profit
  if(isNearProfit) {

    //First, get difference of current closePrice with preClosePrice
    let checkPriceDiff = lib.toNumber((preClosePrice - closePrice),'abs');

    //Get percentage of this difference
    let checkPriceDiffPerc = lib.toNumber(checkPriceDiff / priceDiff * 100);

    //Determine if this difference is negative or in opposite direction to hitting profit
    let isOpposing = dir == 'BUY' ?  (closePrice - preClosePrice) < 0 : (preClosePrice - closePrice) < 0;

    //If trend is now moving in opposite direction and trend percentage is above threshold

    console.log('epic: ' + epic + ' checkPriceDiffPerc: ' + checkPriceDiffPerc + ' isOpposing: ' + isOpposing);

    if(isOpposing && checkPriceDiffPerc >= priceDiffThreshold){

      //If current price is still in profit
      let isProfit = dir == 'BUY' ? (lastCloseBid - x.level) > 0 : (x.level -  lastCloseAsk) > 0;

      //is near profit
      let isNewProfit = false;
      let closeDiff = lib.toNumber((x.limitLevel - closePrice),'abs');
      let openDiff = lib.toNumber((x.limitLevel - x.level),'abs');
      let profitPerc = lib.toNumber((closeDiff / openDiff) * 100);
      if( profitPerc > 70 && profitPerc < 100 ) isNearProfit = true;

      console.log('epic: ' + epic + ' isNearProfit: ' + isNearProfit + ' profitPerc: ' + profitPerc);

      if(isProfit && isNearProfit){

          //Close as profit

          console.log('Near Profit check: closing trade, is near profit ( ' + profitPerc +'% ) and trend is changing: ' + markets[x.marketId].epic + 'mid: ' + x.marketId);
          let nearProfitData = {
            'preClosePrice': preClosePrice,
            'nearoffset': nearoffset + '(5% of new limit)',
            'newLimit': newLimit,
            'direction': dir,
            'checkPriceDiff' : checkPriceDiff,
            'checkPriceDiffPerc': checkPriceDiffPerc,
            'profitPerc' : profitPerc,
            'closeDiff' :closeDiff,
            'openDiff': openDiff,
            'x':x
          }
          console.log(util.inspect(nearProfitData, false, null));

          markets[x.marketId].closeprofit = true;
          if(markets[x.marketId].streamingPricesAvailable == false){
              console.log('streamingPrices is not available, closing without streaming');
              actions.closeNonStreamingTrade(x,markets[x.marketId],closePrice);
          }

      } else {
          console.log('Near Profit check: not closing');
      }
    } else {
      console.log('Near Profit check: No opposite trend');
    }
  } else {
    console.log('Near Profit check: Not near profit');
  }

} else {
  console.log('Could not check near profit as no trade on monitor was found');
}

}


/* CLOSE NON TRADING STREAM */

actions.closeNonStreamingTrade = async function(m,mrkt,closePrice){
console.log('market closeprofit: ' + mrkt.closeprofit);
if(mrkt.closeprofit == true){
  //close position
  console.log('Non streaming position limit reached, closing position.');

  let closeAnalysis = {
    timestamp: Date.now(),
    date: moment.utc().local().format('LLL'),
    limitLevel: m.limitLevel,
    stopLevel: m.stopLevel,
    newLimit: m.newLimit,
    lastClose: closePrice,
    direction: m.direction,
    openLevel: m.level,
    data: m,
    dealId: m.dealId,
    profit:null
  }

  await api.closePosition(m.dealId).then(async r =>{
    console.log(util.inspect(r, false, null));
    if(r.confirms.dealStatus == 'REJECTED' && r.confirms.reason == 'MARKET_CLOSED_WITH_EDITS'){
      console.log('Market is closed, cannot close position. Stopping.');
      marketIsClosed = true;
    }

    closeAnalysis.profit = r.confirms.profit;

    if(marketIsClosed == false){
      var mailOptions = {
        from: 'contact@milesholt.co.uk',
        to: 'miles_holt@hotmail.com',
        subject: 'Closed position. PROFIT. ' + m.epic,
        text: JSON.stringify(closeAnalysis)
      };
      mailer.sendMail(mailOptions);
      log.closeTradeLog(m.epic,closeAnalysis);

    } else {
      console.log('Market is closed, not closing or stopping anything, returning false.');
    }

    return false;

  }).catch(e => {
    error.handleErrors(e);
  });

}
}


/* Determine Stop Level Adjustment */



actions.determineStopLevelAdjustment = async function(){

  console.log('determining Stop Level adjustment for: ' + epic);

  //Determine whether to adjust the stop level when in profit each hour. 
  //This is in additional to the same adjustment checks which are done in the monitor but fail

  /*

  1) Is the profit level above 20%, 50%, 80%?
  2) If true, has the stop level been adjusted already for that percentage?
  3) If false, move the stop level 20%, 50%, 80%
   

  */
  let p = {};
  monitors.forEach(monitor =>{
     if(monitor.epic == epic) p = monitor;
  });

  if(!lib.isEmpty(p)){

    const dir = p.direction;

    let profitThreshold;
    let profitThreshold50;
    let profitThreshold80;
    let adjustedStopLevel;
                              
    if (dir === "BUY") {
        profitThreshold = p.level + (0.2 * (p.limitLevel - p.level));
        profitThreshold50 = p.level + (0.5 * (p.limitLevel - p.level));
        profitThreshold80 = p.level + (0.8 * (p.limitLevel - p.level));
    } else if (dir === "SELL") {
        profitThreshold = p.level - (0.2 * (p.level - p.limitLevel));
        profitThreshold50 = p.level - (0.5 * (p.level - p.limitLevel));
        profitThreshold80 = p.level - (0.8 * (p.level - p.limitLevel));
    }
    
    let breakEven = p.level; // Adjust if you want different logic
    let currentPrice = dir == "BUY" ? lastCloseBid : lastCloseAsk;
    let originalStopLevel = markets[p.marketId].deal.stopLevel ?? p.stopLevel;

    
    console.log('profitThreshold: ' + profitThreshold);
    console.log('profitThreshold50: ' + profitThreshold50);
    console.log('profitThreshold80: ' + profitThreshold80);
    console.log('currentPrice: ' + currentPrice);
    console.log('dir: ' + dir);
                                 
     if ((dir === "BUY" && currentPrice > profitThreshold) || (dir === "SELL" && currentPrice < profitThreshold)) {
      
        //First setup trailingstop when 20% profit reached
        //Trailing distance needs to be 20% of points differnece between currentPrice and stopLevel
        let difference = Math.abs(p.stopLevel - currentPrice); // Absolute difference
        let trailingStopDistance = difference * 0.20;
        let trailingStopIncrement = (trailingStopDistance * 0.1) > 1 ? trailingStopDistance * 0.1 : 1; // Example: Increment is 10% of distance
                                            
        let isAdjustedStopDefined = lib.isDefined(markets[p.marketId], 'adjustedStop');
        let isTrailingStopDefined = lib.isDefined(markets[p.marketId], 'trailingStop');

        console.log('Checking adjusted stop thresholds...');
    
        let shouldAdjust = false;
        let adjustedStopLevel = p.stopLevel;
        let adjustingKey = 'adjustedStop';
    
        // Ensure tracking properties exist
        markets[p.marketId].adjustedStop ??= null;
        markets[p.marketId].adjustedStop50 ??= null;
        markets[p.marketId].adjustedStop80 ??= null;
    
        // Define threshold levels dynamically
        const thresholds = [
            { level: 0.2, key: 'adjustedStop', threshold: profitThreshold },
            { level: 0.5, key: 'adjustedStop50', threshold: profitThreshold50 },
            { level: 0.8, key: 'adjustedStop80', threshold: profitThreshold80 }
        ];
    
        for (const { level, key, threshold } of thresholds) {

            console.log(key + ': ' +  markets[p.marketId][key]);
          
            if ((dir === "BUY" && currentPrice > threshold && markets[p.marketId][key] == null) ||
                (dir === "SELL" && currentPrice < threshold && markets[p.marketId][key] == null)) {
    
                adjustedStopLevel = await actions.calculateAdjustedStop(dir, p.stopLevel, p.level, level, currentPrice, originalStopLevel);
                markets[p.marketId][key] = true;
                shouldAdjust = true;
                adjustingKey = key;
            }

            //if threshold is 50% or 80% determine whether to adjust level and continue trade
            if(threshold.level === 0.5 || threshold.level === 0.8) actions.determineAdjustPosition(dir,currentPrice,markets[p.marketId]);
        }
    
        if (shouldAdjust) {
            console.log('Profit level reached, adjusting stop level...');
    
            let trailingData = {
                guaranteedStop: "false",  // Convert boolean to string
                stopLevel: String(p.stopLevel),  // Convert numbers to strings
                limitLevel: String(p.limitLevel),
                trailingStop: "true",
                trailingStopDistance: String(trailingStopDistance.toFixed(2)),  // Round and convert
                trailingStopIncrement: String(trailingStopIncrement.toFixed(2)) // Round and convert
            };
    
            let adjustData = {
                "stopLevel": adjustedStopLevel.toFixed(2),
                "limitLevel": String(p.limitLevel),
                "trailingStop": "false"
            };

          //Check if stop level not adjusted yet or not failed to adjust (null)
          if (!isAdjustedStopDefined || (isAdjustedStopDefined && markets[p.marketId].adjustedStop !== false)) {
          
            try {
                //First try trailing stop
                const response = await api.editPosition(p.dealId, trailingData);
                if (response.dealStatus === 'ACCEPTED') {
                    console.log("Trailing stop applied.");
                    markets[p.marketId].trailingStop = true;
                    markets[p.marketId].adjustedStop = true;
                    markets[p.marketId].adjustedTrailing = true;
                } else {

                    //Then try adjusting stop level
                    console.warn("Trailing stop was rejected. Trying to adjust stop level instead...");
                    try {
                        const response = await api.editPosition(p.dealId, adjustData);
                        if (response.dealStatus === 'ACCEPTED') {
                            console.log("Adjusted stop level applied:", adjustedStopLevel);
                            markets[p.marketId].adjustedStop = true;
                        } else {
                            console.warn("Failed to apply adjusted stop:", response);
                            markets[p.marketId].adjustedStop = false;
                            markets[p.marketId][adjustingKey] = false;
                        }
                    } catch (error) {
                        console.error("API error while adjusting stop:", error);
                        markets[p.marketId].adjustedStop = null; 
                        markets[p.marketId][adjustingKey] = null;

                    }
                }
            } catch (error) {
                console.error("API error while applying trailing stop:", error);
                markets[p.marketId].adjustedStop = null; 
            }
    
          } //if already adjusted or not yet failed
          
        } //if should adjust

       
  
  }//if threshold reached

  } //if p

} //end of function




/* Determine Stop Level Adjustment (Original) */

actions.determineStopLevelAdjustmentOff = async function(){

  console.log('determining Stop Level adjustment for: ' + epic);

  //Determine whether to adjust the stop level when in profit each hour. 
  //This is in additional to the same adjustment checks which are done in the monitor but fail

  /*

  1) Is the profit level above 20%, 50%, 80%?
  2) If true, has the stop level been adjusted already for that percentage?
  3) If false, move the stop level 20%, 50%, 80%
   

  */
  let p = {};
  monitors.forEach(monitor =>{
     if(monitor.epic == epic) p = monitor;
  });

  if(!lib.isEmpty(p)){

    const dir = p.direction;

    let profitThreshold;
    let profitThreshold50;
    let profitThreshold80;
    let adjustedStopLevel;
                              
    if (dir === "BUY") {
        profitThreshold = p.level + (0.2 * (p.limitLevel - p.level));
        profitThreshold50 = p.level + (0.5 * (p.limitLevel - p.level));
        profitThreshold80 = p.level + (0.8 * (p.limitLevel - p.level));
    } else if (dir === "SELL") {
        profitThreshold = p.level - (0.2 * (p.level - p.limitLevel));
        profitThreshold50 = p.level - (0.5 * (p.level - p.limitLevel));
        profitThreshold80 = p.level - (0.8 * (p.level - p.limitLevel));
    }
    
    let breakEven = p.level; // Adjust if you want different logic
    let currentPrice = dir == "BUY" ? lastCloseBid : lastCloseAsk;
                                 
     if ((dir === "BUY" && currentPrice > profitThreshold) || (dir === "SELL" && currentPrice < profitThreshold)) {
      
        //First setup trailingstop when 20% profit reached
        //Trailing distance needs to be 20% of points differnece between currentPrice and stopLevel
        let difference = Math.abs(p.stopLevel - currentPrice); // Absolute difference
        let trailingStopDistance = difference * 0.20;
        let trailingStopIncrement = (trailingStopDistance * 0.1) > 1 ? trailingStopDistance * 0.1 : 1; // Example: Increment is 10% of distance

        let updateData = {
            guaranteedStop: "false",  // Convert boolean to string
            stopLevel: String(p.stopLevel),  // Convert numbers to strings
            limitLevel: String(p.limitLevel),
            trailingStop: "true",
            trailingStopDistance: String(trailingStopDistance.toFixed(2)),  // Round and convert
            trailingStopIncrement: String(trailingStopIncrement.toFixed(2)) // Round and convert
        };

      //The following is for checks with newStop, where threshold is above 50% or 80%
      //This check should only request API once and not run at every interval
                                        
      let isAdjustedStopDefined = lib.isDefined(markets[p.marketId], 'adjustedStop');
      let isTrailingStopDefined = lib.isDefined(markets[p.marketId], 'trailingStop');
                                   
      //Only proceed if trailingstop already tried
      if (isTrailingStopDefined) {
      
                  console.log('checking adjusted stop thresholds');
      
                  //Do adjustment checks for thresholds
      
                  //Set default
                  let shouldAdjust = false;
                  let adjustedStopLevel = null;
      
                  // Ensure tracking properties exist
                  if (!markets[p.marketId].hasOwnProperty('adjustedStop50')) {
                      markets[p.marketId].adjustedStop50 = false;
                  }
                  if (!markets[p.marketId].hasOwnProperty('adjustedStop80')) {
                      markets[p.marketId].adjustedStop80 = false;
                  }
      
                  // Check and apply stop adjustments
                  //Also run check each time monitor restarts and if adustedStop is defined but is false 
        
                  if ((dir === "BUY" && currentPrice > profitThreshold50 && !markets[p.marketId].adjustedStop50) || 
                      (dir === "BUY" && currentPrice > profitThreshold50 && markets[p.marketId].adjustedStop50 == false && index == 1) ||
                      (dir === "SELL" && currentPrice < profitThreshold50 && !markets[p.marketId].adjustedStop50) || 
                      (dir === "SELL" && currentPrice < profitThreshold50 && markets[p.marketId].adjustedStop50 == false && index == 1)) {
                      adjustedStopLevel = dir === "BUY" 
                          ? p.stopLevel + (0.5 * (p.level - p.stopLevel)) 
                          : p.stopLevel - (0.5 * (p.stopLevel - p.level));
                      markets[p.marketId].adjustedStop50 = true; // Mark threshold as hit
                      shouldAdjust = true;
                  } 
                  else if ((dir === "BUY" && currentPrice > profitThreshold80 && !markets[p.marketId].adjustedStop80) || 
                           (dir === "BUY" && currentPrice > profitThreshold80 && markets[p.marketId].adjustedStop80 == false && index == 1) || 
                           (dir === "SELL" && currentPrice < profitThreshold80 && !markets[p.marketId].adjustedStop80) ||
                           (dir === "SELL" && currentPrice < profitThreshold80 && markets[p.marketId].adjustedStop80 == false && index == 1)) {
                      adjustedStopLevel = dir === "BUY" 
                          ? p.stopLevel + (0.8 * (p.level - p.stopLevel)) 
                          : p.stopLevel - (0.8 * (p.stopLevel - p.level));
                      markets[p.marketId].adjustedStop80 = true; // Mark threshold as hit
                      shouldAdjust = true;
                  }
      
                  if (shouldAdjust) {

                    console.log('Profit level reached, adjusting stop level');
                    console.log('adjustedStop50: ' + markets[p.marketId].adjustedStop50);
                    console.log('adjustedStop80: ' + markets[p.marketId].adjustedStop80);
                      
                    let adjustData = {
                          "stopLevel": String(adjustedStopLevel.toFixed(2)),
                          "limitLevel": String(p.limitLevel),
                          "trailingStop": "false",
                          "trailingStopDistance": null,
                          "trailingStopIncrement": null
                      }
      
                      await api.editPosition(p.dealId, adjustData).then(r => {
                          if (r.dealStatus == 'ACCEPTED') {
                              console.log("Adjusted stop level applied:", adjustedStopLevel);
                              markets[p.marketId].adjustedStop = true;
                          } else {
                              console.log("Failed to apply adjusted stop.");
                              markets[p.marketId].adjustedStop = false;
                          }
                      }).catch(e => console.log(e));
                  }
      } else {

        //No trailing stop defined, try with trailing stop
        
        console.log("Profit target reached. Updating to trailing stop...");
        console.log("Deal Id: " + p.dealId);
        console.log('dir', dir);
        console.log('currentPrice', currentPrice);
        console.log('entryPrice', p.level);
        console.log('profitThreshold', profitThreshold);
        console.log('market dealId', markets[p.marketId].deal.dealId);
        console.log('market epic', markets[p.marketId].epic);

        await api.editPosition(p.dealId, updateData).then(async r =>{
            console.log(util.inspect(r, false, null));
          
            if(r.dealStatus == 'ACCEPTED'){
               console.log("Trailing stop applied:");
               markets[p.marketId].trailingStop = true;
               markets[p.marketId].adjustedStop = true;
               markets[p.marketId].adjustedTrailing = true;
               
            }

            if(r.dealStatus == 'REJECTED'){

                  markets[p.marketId].trailingStop = false;
                  markets[p.marketId].adjustedStop = false;
                  markets[p.marketId].adjustedTrailing = true;
              
                  console.log('Trailing stop was rejected, market might not allow trailing, trying to adjust stop level instead.');

                  //Set new stop level 20% of difference between current price, and existing stop level. So this should reduce loss by 20% if moving in the right direction.
                  
                  if (dir === "BUY") {
                      adjustedStopLevel = p.stopLevel + (0.2 * (p.level - p.stopLevel));
                  } else if (dir === "SELL") {
                      adjustedStopLevel = p.stopLevel - (0.2 * (p.stopLevel - p.level));
                  }
              
                  let updateData2 = {
                      "stopLevel": String(adjustedStopLevel.toFixed(2)),
                      "limitLevel": String(p.limitLevel),
                      "trailingStop": "false",
                      "trailingStopDistance": null,
                      "trailingStopIncrement": null
                  }
              
                  await api.editPosition(p.dealId, updateData2).then(r => {
                      if (r.dealStatus == 'ACCEPTED') {
                          console.log("Adjusted stop applied:", adjustedStopLevel);
                          markets[x.marketId].adjustedStop = true;
                          
                      } else {
                          console.log("Failed to apply adjusted stop.");
                          markets[x.marketId].adjustedStop = false;
                          
                      }
                  }).catch(e => console.log(e));
            }
            
        }).catch(e => console.log(e));

        console.log('updateData');
        console.log(updateData);

     } //if trailing or not 
       
    } // if price above treshold
    
  } // if x
  
} //end of function


actions.calculateAdjustedStop = async function(dir, stopLevel, level, percentage, currentPrice, originalStopLevel) {
    /*return dir === "BUY" 
        ? stopLevel + (percentage * (level - stopLevel)) 
        : stopLevel - (percentage * (stopLevel - level));*/
  
    return dir === "BUY" 
       ? originalStopLevel + ((currentPrice - level)) 
       : originalStopLevel - ((level - currentPrice));

}


actions.determineAdjustPosition = async function(dir, currentPrice, mk){
          
          //add for live
          const pos = {
            dir: dir,
            currentPrice: currentPrice,
            marketId: mk.id
          };
          liveExtendPositions.push(pos);
  
          const m = mk.data.strategy2;                           
            
          if(m.makeTrade === true){              
                                        
            try {
                  const tradeParams = {
                    entryPrice: currentPrice,
                    desiredLossAmount: desiredLossAmount,      
                    desiredProfitAmount: desiredProfitAmount,    
                    accountEquity: accountBalance,    
                    marketInfo: mk,        
                    direction: dir,    
                  };
              
                  const tradeDetails = await strategy2.actions.calculateTradeDetails(tradeParams, set);

                  if (dir === "BUY") {
                    m.limitLevel = closePrice + tradeDetails.limitDistance;
                    m.stopLevel = closePrice - tradeDetails.stopDistance;
                  } else if (dir === "SELL") {
                    m.limitLevel = closePrice - tradeDetails.limitDistance;
                    m.stopLevel = closePrice + tradeDetails.stopDistance;
                  }
                  
                  //If strategy2 would make trade, continue rather than closing
                  let adjustPositionData = {
                      "stopLevel": m.stopLevel,
                      "limitLevel": m.limitLevel,
                  }

                  await api.editPosition(x.dealId, adjustPositionData).then(async r => {
                      if (r.dealStatus == 'ACCEPTED') {
                          console.log("Adjusted position after reaching profit");  
                        
                          //Restart monitor once position updated, new position details should be fetched by api
                          stream.actions.unsubscribe(mk.epic);                      
                          isStreamRunning[mk.epic] = false;
                          monitors[mk.epic].subscribed = false;
                          await monitor.iniMonitor(mk.deal.dealId, mk.deal.dealRef, mk.epic, mk.id);
                      
                         
                      } else {
                          console.log("Failed to apply adjusted position after reaching threshold");
                          console.log(r.dealStatus);
                          //continue to close is failed to adjust position
                      }
                  }).catch(e => console.log(e));
                  
            } catch (error) {
                  console.error("Error, unable to calulateTradeDetails for adjust position:", error.message);
                  //continue to close position if unable to adjust
            }
                               
          }  
                                  
}

module.exports = {
  actions: actions
}
