var actions = {};
var core;
var lib;
var loop;
var notification;
var api;
var monitor;
var util;
var log;
var lib;
var error;
var moment;

//Call specific service to handle ai actions
//const ai = require("../services/ai.js");

/*

REQUIRE

*/

actions.require = async function () {
  core = require.main.exports;
  lib = core.lib.actions;
  cloud = core.cloudHandler.actions;
  loop = core.loopHandler.actions.loop;
  notification = core.notificationHandler.actions;
  log = core.log.actions;
  api = core.api;
  monitor = core.monitor.actions;
  error = core.errorHandler.actions;
  util = core.util;
  moment = core.moment;
};

actions.iniRun = async function () {
  var set = {
    epic: market.epic,
    dataPath: aiDataDir,
    prices: prices,
    results: [],
    findings: {},
    go: false,
    output: {},
    lastCloseBid: lastCloseBid,
    lastCloseAsk: lastCloseAsk,
    marketidx: mid,
  };

  //console.log("------------------------prices---------------------");
  //console.log(prices);

  //let data = await pricedata.support.map((r) => parseFloat(r.close).toFixed(2));
  let data = pricedata.support.map((p) => p.close);
  console.log("data:");
  console.log(data);

  //const sma = await actions.calculateSMA(data, 20);
  //const macd = await actions.calculateMACD(data);
  //const bollinger = await actions.calculateBollingerBands(data, 20, 2);

  // Run the analysis
  const result = await actions.analyseSignals(data);
  console.log("Trading Signal:", result.signal);
  console.log("Certainty:", result.certainty);

  //return result;
  if((result.signal == 'BUY || result.signal == 'SELL') && result.certainty >= 0.7){
    console.log('Making trade...');
    set.decision = result.signal;
    await actions.beginTrade(set);  
  } else {
    console.log('Did not make trade');
  }
};

// Helper function: Simple Moving Average
actions.calculateSMA = async function (data, period) {
  if (data.length < period) {
    throw new Error("Data length must be greater than or equal to the period.");
  }
  return data.map((_, idx, arr) => {
    if (idx < period - 1) {
      return undefined; // Not enough data for SMA
    }
    const slice = arr.slice(idx - period + 1, idx + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
  });
};

// Helper function: Exponential Moving Average
actions.calculateEMA = async function (data, period) {
  const multiplier = 2 / (period + 1);
  return data.reduce((ema, value, idx) => {
    if (idx === 0) {
      ema.push(value); // First EMA is the first data point
    } else {
      ema.push(value * multiplier + ema[idx - 1] * (1 - multiplier));
    }
    return ema;
  }, []);
};

// Helper function: MACD
actions.calculateMACD = async function (
  data,
  shortPeriod,
  longPeriod,
  signalPeriod
) {
  const emaShort = await actions.calculateEMA(data, shortPeriod);
  const emaLong = await actions.calculateEMA(data, longPeriod);
  const macdLine = emaShort.map((val, idx) => (val || 0) - (emaLong[idx] || 0));
  const signalLine = await actions.calculateEMA(
    macdLine.filter((val) => val !== undefined),
    signalPeriod
  );
  const histogram = macdLine.map(
    (val, idx) => (val || 0) - (signalLine[idx] || 0)
  );
  return { macdLine, signalLine, histogram };
};

// Helper function: Bollinger Bands
actions.calculateBollingerBands = async function (data, period, multiplier) {
  console.log("doing bollinger function, data is:");
  console.log(data);

  console.log("period:");
  console.log(period);

  console.log("multiplier:");
  console.log(multiplier);

  const sma = await actions.calculateSMA(data, period);

  console.log('sma:');
  console.log(sma);

  /*const bands = sma.map((mean, idx) => {
    if (mean === null) {
      console.log("mean is null");
      return { upper: null, lower: null };
    }
    const slice = data.slice(idx - period + 1, idx + 1);
    const stdDev = Math.sqrt(
      slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    );
    return {
      upper: mean + multiplier * stdDev,
      lower: mean - multiplier * stdDev,
    };
  });
  return bands;*/

  const bollinger = data.map((_, idx) => {
    if (idx < period - 1 || sma[idx] === undefined) {
      return { upper: undefined, lower: undefined }; // Not enough data
    }

    const slice = data.slice(idx - period + 1, idx + 1);
    const mean = sma[idx];

    // Standard deviation
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: mean + multiplier * stdDev,
      lower: mean - multiplier * stdDev,
    };
  });

  console.log('bollinger output');
  console.log(bollinger);
  return bollinger;
};

// Helper function: Fibonacci Levels
actions.getFibonacciLevels = async function (data) {
  const high = Math.max(...data);
  const low = Math.min(...data);
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const levels = ratios.map((ratio) => high - (high - low) * ratio);
  const currentPrice = data[data.length - 1];
  const support =
    levels.filter((level) => level < currentPrice).slice(-1)[0] || null;
  const resistance = levels.filter((level) => level > currentPrice)[0] || null;
  return { high, low, currentPrice, support, resistance };
};

// Decision-making function: Analyse Signals
actions.analyseSignals = async function (data) {
  
  const sma = await actions.calculateSMA(data, 20)[data.length - 1]; // Last SMA value
  const macd = await actions.calculateMACD(data, 12, 26, 9);
  
  // Get the last Bollinger Band values
  const bollingerArray = await actions.calculateBollingerBands(data, 20, 2);
  const bollinger = bollingerArray[bollingerArray.length - 1];
  
  const fibonacci = await actions.getFibonacciLevels(data);

  console.log("bollinger");
  console.log(bollinger);

  let signal = "HOLD";
  let certainty = 0;

  // Check SMA relative to Fibonacci levels
  if (fibonacci.support && sma < fibonacci.support) {
    signal = "BUY";
    certainty += 0.3;
  }
  if (fibonacci.resistance && sma > fibonacci.resistance) {
    signal = "SELL";
    certainty += 0.3;
  }

  // MACD indicator
  const macdTrend = macd.histogram[macd.histogram.length - 1];
  if (macdTrend > 0) {
    signal = "BUY";
    certainty += 0.4;
  } else if (macdTrend < 0) {
    signal = "SELL";
    certainty += 0.4;
  }

  // Bollinger Bands
  if (bollinger && bollinger.lower !== undefined && bollinger.upper !== undefined) {
    const lastPrice = data[data.length - 1]; // Most recent price
    if (lastPrice < bollinger.lower) {
      signal = "BUY";
      certainty += 0.3;
    }
    if (lastPrice > bollinger.upper) {
      signal = "SELL";
      certainty += 0.3;
    }
  } else {
    console.warn("Bollinger Bands are undefined or incomplete. Skipping this indicator.");
  }

  // Default to HOLD if certainty is too low
  if (certainty < 0.5) {
    signal = "HOLD";
  }

  return { signal, certainty };
};

actions.beginTrade = async function (set) {
  console.log(
    "BEGINNING TRADE USING STRATEGY HANDLER 2... Epic: " +
      market.epic +
      " Set epic: " +
      set.epic
  );

  //var lastClosePrice = pricedata[pricedata.length - 1];
  var dir = set.decision;
  var entryPrice = dir == "SELL" ? set.lastCloseBid : set.lastCloseAsk;

  const tradeParams = {
    entryPrice: entryPrice,
    stopPercentage: 5,
    riskPercentage: 1,
    accountEquity: 10000,
    valuePerPoint: 1,
    riskRewardRatio: 2,
  };
  //

  const tradeDetails = await actions.calculateTradeDetails(tradeParams, set);

  tradeDetails.direction = dir;
  tradeDetails.entryPrice = entryPrice;
  set.details = tradeDetails;
  //console.log(tradeDetails);
  await actions.openPosition(tradeDetails, set);
};

actions.calculateTradeDetails = function (params, set) {
  const {
    entryPrice,
    stopPercentage,
    riskPercentage,
    accountEquity,
    valuePerPoint,
    riskRewardRatio,
  } = params;

  // Calculate Stop Distance in Points
  const stopDistance = entryPrice * (stopPercentage / 100);

  // Calculate Stop Loss Price for a Short Position
  const stopLossPrice = entryPrice + stopDistance;

  // Calculate Limit Distance in Points based on Risk-Reward Ratio
  const limitDistance = stopDistance * riskRewardRatio;

  // Calculate Take Profit Price for a Short Position
  const takeProfitPrice = entryPrice - limitDistance;

  // Calculate Risk Per Trade
  const riskPerTrade = accountEquity * (riskPercentage / 100);

  // Calculate Position Size
  const size = riskPerTrade / (stopDistance * valuePerPoint);

  let cp = entryPrice;
  // stopDistance = Math.abs(cp - stopDistanceLevel);
  // limitDistance = Math.abs(cp - limitDistanceLevel);

  let minSize =
    markets[set.marketidx].minimumSize.type == "points"
      ? markets[set.marketidx].minimumSize.value
      : lib.toNumber(cp * markets[set.marketidx].minimumSize.value);

  if (size <= minSize) {
    console.log("size is less than minSize, using minSize");
    console.log("previous size:");
    console.log(size);

    size = minSize;

    console.log("new size:");
    console.log(size);
  }
  console.log("calculating size:");
  console.log("value per point:");
  console.log(valuePerPoint);
  console.log("risk per trade:");
  console.log(riskPerTrade);
  console.log("stop distance:");
  console.log(stopDistance);

  console.log("minimum size order:");
  console.log(minSize);

  console.log("size:");
  console.log(size);

  return {
    stopDistance,
    stopLossPrice,
    limitDistance,
    takeProfitPrice,
    size,
  };
};

actions.openPosition = async function (details, set) {
  console.log("Beginning trade using Strategy Handler 2...");

  //await notification.notify('trade-being-made', 'Trade is being made');

  //Check if we already have a position
  let positionOpen = false;

  if (!lib.isEmpty(markets[set.marketidx].deal)) {
    console.log("market deal is not empty");
    let dealId = markets[set.marketidx].deal.dealId;
    console.log("dealId: " + dealId);
    await api
      .getPosition(String(dealId))
      .then(async (positionData) => {
        //Check status pre-existing dealId
        console.log("Found position currently open.");
        console.log(positionData);
        //If status is CLOSED, we can open a new position
        if (positionData.market.marketStatus !== "CLOSED") {
          positionOpen = true;
          console.log("positionOpen should now be true: " + positionOpen);
        }

        if (positionData.market.marketStatus == "CLOSED") {
          console.log("Found open position but status is closed");
          markets[set.marketidx].deal = {};
        }
      })
      .catch(async (e) => {
        //API might fail to find position, go again
        //Check history for position
        //If still no position recorded, end exec and log issue
        await api
          .acctTransaction("ALL_DEAL", date2, date1, 20, 1)
          .then((r) => {
            r.transactions.forEach((transaction) => {
              if (dealId === transaction.reference) {
                //Deal found in transaction history. Clear position and continue with trade.
                console.log(
                  "deal is not empty, but no dealId found in transactions or as open position, resetting.."
                );
                markets[set.marketidx].deal = {};
              }
            });
          })
          .catch((e) => {
            //Problem getting transaction history. Ending exec
            //Handle error
            return false;
          });
      });
  } else {
    console.log("market deal is empty");
  }

  //Check for existing open tickets
  await api
    .showOpenPositions()
    .then(async (positionsData) => {
      //console.log(util.inspect(positionsData, false, null));
      if (positionsData.positions.length > 0) {
        positionsData.positions.forEach((position) => {
          if (position.market.epic == set.epic) {
            positionOpen = true;
            if (lib.isEmpty(markets[set.marketidx].deal)) {
              console.log(
                "Position found on server, but deal on marketdata is empty"
              );
            }
          }
        });
      }
    })
    .catch((e) => console.log(e));

  let ticketError = false;

  //if(!positionOpen && positionsData.positions.length === 0){
  console.log("positionOpen before making trade: " + positionOpen);

  let go = positionOpen == false && lib.isEmpty(market.deal) ? true : false;
  let dir = trend == "bullish" ? "BUY" : "SELL";

  /* REPAIR COUNTER TRADE METHOD */

  //overide if possible trade is in opposite direction
  //close existing trade at loss and begin new trade in other direction
  let repairdelay = 0;
  /*if(!lib.isEmpty(market.deal)){
          if(dir !== market.deal.direction){
            console.log('new dir: ' + dir );
            console.log('current deal direction: ' + market.deal.direction);
            console.log('Closing open trade as loss, and beginning new one in other direction');
            go = true;
            markets[mid].closeloss = true;
            repairdelay = 20000; //wait 2 minutes for it to detect closeloss in stream, before starting a new one
          }
        }*/

  if (go === true) {
    console.log("beginnign trade on epic: " + set.epic);
    console.log("trade details:");
    console.log(details);
    //console.log("set:");
    //console.log(set);

    //No open positions, begin trade
    ticket = {
      currencyCode: "GBP",
      direction: details.direction,
      epic: set.epic,
      expiry: markets[set.marketidx].expiry,
      size: details.size.toFixed(2),
      forceOpen: true,
      orderType: "MARKET",
      level: null,
      limitDistance: details.limitDistance.toFixed(2),
      limitLevel: null,
      stopDistance: details.stopDistance.toFixed(2),
      stopLevel: null,
      guaranteedStop: false,
      timeInForce: "FILL_OR_KILL",
      trailingStop: null,
      trailingStopIncrement: null,
    };

    console.log("ticket:");
    console.log(ticket);

    analysis.ticket = ticket;
    //console.log(analysis);

    //Open a ticket
    await api
      .deal(ticket)
      .then(async (r) => {
        console.log(util.inspect(r, false, null));
        let ref = r.positions.dealReference;
        analysis.dealReference = ref;

        if (!r.confirms.dealId) {
          console.log("Error: " + r.confirms.errorCode);

          //let e = {'body': {'errorCode': r.confirms.errorCode, 'error': r, 'ticket' : ticket }};
          //await error.handleErrors(e);

          console.log(
            "Checking again, and confirming position with deal ref: " + ref
          );
          ticketError = true;

          //Get status of position if error
          await api
            .confirmPosition(ref)
            .then(async (rc) => {
              //console.log(util.inspect(rc, false, null));
              //Check again as sometimes there's an error - not found - if it's still being processed

              if (
                rc.dealStatus == "ACCEPTED" &&
                rc.reason == "SUCCESS" &&
                rc.status == "OPEN"
              ) {
                ticketError = false;
                console.log("affectedDeals:");
                console.log(rc.affectedDeals);
                console.log("orig dealId:" + rc.dealId);
                let id = rc.affectedDeals.length
                  ? rc.affectedDeals[0].dealId
                  : rc.dealId;
                analysis.dealId = id;
                analysis.openLevel = rc.level;
                console.log(r.confirms);
                console.log(
                  "deal success, dealId should be:" + analysis.dealId
                );
              }
            })
            .catch((e) => {
              console.log(
                "could not confirm position with deal reference: " + ref
              );
              console.log(e);
            });

          if (ticketError) {
            //Send email
            //Handle ticket error
            analysis.errorInformation = rc;
            await notification.notify("deal-ticket-error", analysis);
          }
        } else {
          //There can be a deal id but also an error, so check for errors again
          await api.confirmPosition(ref).then(async (rc) => {
            //console.log(util.inspect(rc, false, null));
            //Check again as sometimes there's an error - not found - if it's still being processed
            ticketError = true;
            if (
              rc.dealStatus == "ACCEPTED" &&
              rc.reason == "SUCCESS" &&
              rc.status == "OPEN"
            ) {
              ticketError = false;
              console.log("affectedDeals:");
              console.log(rc.affectedDeals);
              console.log("orig dealId:" + rc.dealId);
              let id = rc.affectedDeals.length
                ? rc.affectedDeals[0].dealId
                : rc.dealId;
              analysis.dealId = id;
            } else if (rc.dealStatus == "REJECTED") {
              //Handle deal being rejected
              //Send notification
              analysis.errorInformation = rc;
              await notification.notify("deal-rejected", analysis);
              let e = { body: { errorCode: "deal-rejected", error: rc } };
              await error.handleErrors(e);
            }
          });
        }
      })
      .catch((e) => {
        //Handle error creating ticket
        ticketError = true;
      });

    if (ticketError == false) {
      //Handle trade made successfully
      //Send notification
      await notification.notify("deal-success", analysis);
      //Begin monitoring
      //monitor.beginMonitor();

      /*
              when monitoring, because we are doing more than one
              we have to assign the epic and dealId to the correct stream / monitor
              So each monitor has to be associated with an ID or object, that contains the epic and dealId it is assigned with
              There could be a monitors array, which contains the MID of whichever market is being monitored
              */

      console.log(
        "Notification actioned. Beginning monitor and logging trade, dealId: " +
          analysis.dealId
      );

      //add a delay here if we are waiting for an existing trade to close (counter trade repair method)
      setTimeout(async () => {
        console.log("repairdelay: " + repairdelay);
        dealId = analysis.dealId;
        dealRef = analysis.dealReference;
        direction = analysis.ticket.direction;

        //Log trade first before monitoring
        await log.startTradeLog(set.epic, analysis, dealId);
        await monitor.iniMonitor(dealId, dealRef, epic);
      }, repairdelay);

      market.tradedBefore = moment.utc().local().valueOf();
      finalMessage =
        "Checks passed and trade has been made. Will go again in 1 hour.";
    } else {
      await log.errorTradeLog(
        analysis.errorInformation,
        analysis.dealReference
      );
      finalMessage =
        "Tried to make a trade, but it failed. Will go again in 1 hour.";
      await notification.notify("deal-ticket-error", analysis);
    }
  } else {
    //Handle already trading on position
    finalMessage = "You are already trading on this epic. Waiting 1 hour.";
  }

  console.log(finalMessage);
};

module.exports = {
  actions: actions,
};
