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
}

/*

DETERMINE TRADE

*/

actions.determineTrade = async function(){

  //If all checks pass, begin trade
  //TODO: Move checks to specific strategy
  const checks = [check0,check1,check2,check5,check6,check7,check8,check9,check10,check11,check12];
  //const checks = [true];
  if(checks.indexOf(false) == -1){

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


        let limitDistanceArea = parseFloat((priceDiff * limitDistancePerc).toFixed(2));

        let stopDistanceFluctuation = parseFloat((priceDiff * stopDistanceFluctuationPerc).toFixed(2));
        let stopDistanceArea = parseFloat(((priceDiff * market.stopDistancePerc) + stopDistanceFluctuation).toFixed(2));

        //These calculations arrive to the same values as the logic above
        //It essentially does everything in one line, calculating the difference while adding/substracting the distance depending on whether it is limit or stop

        //let nl = parseFloat(Math.abs(lastCloseAsk - (lastCloseBid + limitDistance)).toFixed(2));
        //let ns = parseFloat(Math.abs(lastCloseAsk - (lastCloseBid - stopDistance)).toFixed(2));

        let limitDistance = lib.toNumber((lastCloseAsk - (lastCloseBid + limitDistanceArea)),'abs');
        let stopDistance = lib.toNumber((lastCloseAsk - (lastCloseBid - stopDistanceArea)),'abs');

        //Handle if minimum stop is in points and check stopDistance isnt less than this
        let minStop = market.minimumStop;
        console.log(minStop);
        if(minStop.type == 'points' && stopDistance <= minStop.value){
          console.log('stopDistance is less than minimum requirement, should be at least: ' + minStop.value + ' ' + minStop.type);
          console.log('stopDistance was: ' +  stopDistance);
          stopDistance = stopDistance + lib.toNumber((minStop.value - stopDistance + 2), 'abs');
          console.log('stopDistance now: ' + stopDistance);
        }

        //Handle for percentage
        const minStopVal = lib.toNumber((trend == 'bullish' ? lastCloseAsk : lastCloseBid) * minStop.value);
        if(minStop.type == 'percentage' && stopDistance <= minStopVal ){
          console.log('stopDistance is less than minimum requirement, should be at least: ' + minStop.value + ' ' + minStop.type);
          console.log('Converted minimumStopVal form percentage: ' + minStopVal);
          console.log('stopDistance was: ' +  stopDistance);
          stopDistance = stopDistance + lib.toNumber((minStopVal - stopDistance + 2), 'abs');
          console.log('stopDistance now: ' + stopDistance);
        }

        //new Method for stopDistance
        //start from minimum and expand by 5%
        let points = 0;
        let stopDistanceOffset = 4;
        if(minStop.type == 'percentage') {
          //do for percentage
          points = (trend == 'bullish' ? lastCloseAsk : lastCloseBid) * (minStop.value * stopDistanceOffset);
        } else{
          //do for points
          points = (minStop.value * stopDistanceOffset);
        }

        let stopDistanceLevel = 0
        if(trend == 'bullish') stopDistanceLevel = lib.toNumber((lastCloseAsk - points), 'abs');
        if(trend == 'bearish') stopDistanceLevel = lib.toNumber((lastCloseBid + points), 'abs');

        stopDistance = points;

        console.log('test stop distance: ' + stopDistance);
        console.log('test new stopDistance level: ' + stopDistanceLevel);



        let ticketError = false;

        //if(!positionOpen && positionsData.positions.length === 0){
        console.log('positionOpen before making trade: ' + positionOpen);
        if(positionOpen == false && lib.isEmpty(market.deal)){

          //No open positions, begin trade
          ticket = {
          	'currencyCode': 'GBP',
          	'direction': trend == 'bullish' ? 'BUY' : 'SELL',
          	'epic': epic,
          	'expiry': 'DFB',
          	'size': market.size,
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

                  dealId = analysis.dealId;
                  dealRef = analysis.dealReference;
                  direction = analysis.ticket.direction;


                  //Log trade first before monitoring
                  await log.startTradeLog(epic, analysis, dealId);
                  await monitor.iniMonitor(dealId,dealRef,epic);

                  market.tradedbefore = true;
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
      market.tradedbefore = false;
      finalMessage = 'Checks not passed. No trade. Waiting 1 hour.'

  }

}

module.exports = {
  actions: actions
}
