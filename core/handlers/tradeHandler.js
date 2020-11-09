var actions = {};
var core;
var loop;
var notification;
var api;
var monitor;
var util;
var log;

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
  util =  core.util;
}

/*

DETERMINE TRADE

*/

actions.determineTrade = async function(){


  //If all checks pass, begin trade
  //TODO: Move checks to specific strategy
  const checks = [check0,check1,check2,check5,check6,check7,check8,check9,check10,check11,check12];
  if(checks.indexOf(false) == -1){

      console.log('All checks passed. Beginning trade...');

      //Check if we already have a position
      let positionOpen = false;
      if(dealId !== ''){
        await api.getPosition(String(dealId)).then(async positionData => {
          //Check status pre-existing dealId
          //If status is CLOSED, we can open a new position
          if(positionData.market.marketStatus !== 'CLOSED'){
            positionOpen = true;
          }
        }).catch(async e => {
          //API might fail to find position, go again
          //Check history for position
          //If still no position recorded, end exec and log issue
          await api.acctTransaction('ALL_DEAL', date2, date1, 20, 1).then(r => {
            r.transactions.forEach(transaction => {
              if(dealId === transaction.reference){
                //Deal found in transaction history. Clear position and continue with trade.
                dealId = '';
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
        console.log(util.inspect(positionsData, false, null));

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
        let cp = trend == 'bullish' ? lastCloseBid : lastCloseAsk;
        //limit distance = 1.5% of lastClose price
        let limitDistance = parseFloat((cp * 0.015).toFixed(2));
        //stop distance = 5% of lastClose price + fluctuation of 10 as prices are changing
        let stopDistance = parseFloat(((cp * 0.05) + stopDistanceFluctuation).toFixed(2));

        //These calculations arrive to the same values as the logic above
        //It essentially does everything in one line, calculating the difference while adding/substracting the distance depending on whether it is limit or stop

        let nl = Math.abs(lastCloseAsk - (lastCloseBid + limitDistance));
        let ns = Math.abs(lastCloseAsk - (lastCloseBid - stopDistance));

        let ticketError = false;

        if(!positionOpen && positionsData.positions.length === 0){
          //No open positions, begin trade
          ticket = {
          	'currencyCode': 'GBP',
          	'direction': trend == 'bullish' ? 'BUY' : 'SELL',
          	'epic': epic,
          	'expiry': 'DFB',
          	'size': size,
          	'forceOpen': true,
          	'orderType': 'MARKET',
          	'level': null,
          	'limitDistance':nl,
          	'limitLevel': null,
          	'stopDistance': ns,
          	'stopLevel': null,
          	'guaranteedStop': false,
          	'timeInForce': 'FILL_OR_KILL',
          	'trailingStop': null,
          	'trailingStopIncrement': null
          };
          analysis.ticket = ticket;
          console.log(analysis);
              //Open a ticket
              await api.deal(ticket).then(async r => {
                console.log(util.inspect(r, false, null));
                let ref = r.positions.dealReference;
                analysis.dealReference = ref;
                dealRef = ref;
                if(!r.confirms.dealId){
                  console.log('Error: ' + r.confirms.errorCode);
                  //Get status of position if error
                  await api.confirmPosition(ref).then(async rc => {
                    console.log(util.inspect(rc, false, null));
                    //Check again as sometimes there's an error - not found - if it's still being processed
                    ticketError = true;
                    if(rc.dealStatus == 'ACCEPTED' && rc.reason == 'SUCCESS' && rc.status == 'OPEN'){
                      ticketError = false;
                      dealId = r.confirms.dealId;
                    }
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
                    console.log(util.inspect(rc, false, null));
                    //Check again as sometimes there's an error - not found - if it's still being processed
                    ticketError = true;
                    if(rc.dealStatus == 'ACCEPTED' && rc.reason == 'SUCCESS' && rc.status == 'OPEN'){
                      ticketError = false;
                      dealId = r.confirms.dealId;
                    } else if(rc.dealStatus == 'REJECTED'){
                      //Handle deal being rejected
                      //Send notification
                      analysis.errorInformation = rc;
                      await notification.notify('deal-rejected', analysis);
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
                  await monitor.iniMonitor(dealId,epic);
                  tradedbefore = true;

                  await log.startTradeLog(epic, analysis, dealId);
                  finalMessage = 'Checks passed and trade has been made. Will go again in 1 hour.';

               } else {

                  await log.errorTradeLog(analysis.errorInformation, analysis.dealReference);
                  finalMessage = 'Tried to make a trade, but it failed. Will go again in 1 hour.';

               }

        } else {
          //Handle already trading on position
          finalMessage = 'You are already trading on this epic. Waiting 1 hour.';

        };
      }).catch(e => console.log(e));
  } else {
      //No trade, wait another hour
      tradedbefore = false;
      finalMessage = 'Checks not passed. No trade. Waiting 1 hour.'

  }

}

module.exports = {
  actions: actions
}
