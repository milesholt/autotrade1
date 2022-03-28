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
}


/*

DETERMINE TRADE

*/

actions.determineTrade = async function(){

  let day = moment.utc().format('ddd');
  if( day == 'Sat' || day == 'Sun'){
    console.log('Should be the weekend. Day is: ' + day);
    console.log('Not beginning trade because it is the weekend and markets will be closed.');
    isDeal = false;
    return false;
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


                  market.tradedBefore = moment.utc().valueOf();
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
  let isNearProfit = dir == 'BUY' ? preClosePrice >= nearoffset : preClosePrice <= nearoffset

  //if preClosePrice was within offset and near profit
  if(isNearProfit) {

    //First, get difference of current closePrice with preClosePrice
    let checkPriceDiff = Math.abs(preClosePrice - closePrice);

    //Get percentage of this difference
    let checkPriceDiffPerc = parseFloat(Number(priceDiff / checkPriceDiff * 100).toFixed(2));

    //Determine if this difference is negative or in opposite direction to hitting profit
    let isOpposing = dir == 'BUY' ?  (closePrice - preClosePrice) < 0 : (preClosePrice - closePrice) < 0;

    //If trend is now moving in opposite direction and trend percentage is above threshold
    if(isOpposing && checkPriceDiffPerc >= priceDiffThreshold){

      //If current price is still in profit
      let isProfit = dir == 'BUY' ? (lastCloseBid - x.level) > 0 : (x.level -  lastCloseAsk) > 0;

      //is near profit
      let isNewProfit = false;
      let closeDiff = Math.abs(x.limitLevel - x.closePrice);
      let openDiff = Math.abs(x.limitLevel - x.level);
      let profitPerc = (closeDiff / openDiff) * 100;
      if( profitPerc > 70 && profitPerc < 100 ) isNearProfit = true;

      if(isProfit && isNearProfit){

          //Close as profit
          console.log('Near Profit check: closing trade, is near profit ( ' + profitPerc +'% ) and trend is changing: ' + markets[x.marketId].epic + 'mid: ' + x.marketId)
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
    date: moment.utc().format('LLL'),
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

module.exports = {
  actions: actions
}
