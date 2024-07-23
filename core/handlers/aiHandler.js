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
const ai = require("../services/ai.js");

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

/*

DO PROMPT
Send a prompt to AI
*/

actions.doAI = async function (prompt, model, format) {
  switch (model) {
    case "gemini-pro":
      return await ai.actions.useGeminiPro(prompt, format);
      break;
  }
};

// Function to introduce a delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

actions.iniRun = async function () {
  var set = {
    epic: market.epic,
    dataPath: aiDataDir,
    prices: prices,
    results: [],
    findings: {},
    go: false,
    output: {},
  };
  actions.runMultiple(set, 0);
};

actions.runMultiple = async function (set, i) {
  console.log("running multiple. epic: - " + set.epic);
  console.log("running AI Query: " + i);

  await actions.runAIQuery(set.prices, 0, set).then(async (result) => {
    if (result !== null) set.results.push(result);
    i++;
    if (i < 5) {
      await delay(60000); // Wait for 1 minute to reduce max number of requests
      actions.runMultiple(set, i);
      //console.log(`Result ${i + 1}:`, result);
    } else {
      //console.log("All results:", set.results);
      await actions.analyseResults(set);
      actions.decide(set);
    }
  });
};

actions.analyseResults = async function (set) {
  // Loop through the array
  set.results.forEach((item) => {
    if (typeof item === "object" && item !== null) {
      for (const key in item) {
        if (!Array.isArray(set.findings[key])) {
          set.findings[key] = [];
        }
        set.findings[key].push(item[key]);
      }
    }
  });

  // Remove 'summary' property
  if (set.findings["summary"]) {
    delete set.findings["summary"];
  }

  // Calculate the average for arrays containing only numbers
  for (const key in set.findings) {
    const values = set.findings[key];
    // Get average for arrays with numbers
    if (values.every((value) => typeof value === "number")) {
      const sum = values.reduce((acc, val) => acc + val, 0);
      set.findings[key] = Math.round(sum / values.length);
    } else if (values.every((value) => typeof value === "string")) {
      // Find the most frequent string in arrays containing only strings
      const frequencyMap = values.reduce((map, value) => {
        map[value] = (map[value] || 0) + 1;
        return map;
      }, {});

      const maxFrequency = Math.max(...Object.values(frequencyMap));
      const mostFrequentStrings = Object.keys(frequencyMap).filter(
        (key) => frequencyMap[key] === maxFrequency,
      );

      if (mostFrequentStrings.length === 1) {
        set.findings[key] = mostFrequentStrings[0];
      }
    }
  }
};

actions.decide = async function (set) {
  set.go = false;
  //console.log(set.findings);
  let f = set.findings;

  //Determine HOLD
  /* Sometimes HOLD is set by AI when it might not necessarily apply. Needs manual check */

  if (f.overallTrend == "downward" && f.decision == "HOLD") {
    const threshold = 3;
    if (
      f.movingAverages <= threshold &&
      f.movingAveragesConvergenceDivergence <= threshold &&
      f.relativeStrengthIndex <= threshold &&
      f.overallRisk !== "high" &&
      f.riskLevel < 5
    )
      f.decision = "SELL";
  }

  if (f.overallTrend == "upward" && f.decision == "HOLD") {
    const threshold = 7;
    if (
      f.movingAverages >= threshold &&
      f.movingAveragesConvergenceDivergence >= threshold &&
      f.relativeStrengthIndex >= threshold &&
      f.overallRisk !== "high" &&
      f.riskLevel < 5
    )
      f.decision = "BUY";
  }

  //Do main check for opening a position

  if (f.overallTrend == "downward") {
    if (
      f.movingAverages < 5 &&
      f.movingAveragesConvergenceDivergence < 5 &&
      f.relativeStrengthIndex < 5 &&
      f.fibonacciRetracement <= 5 &&
      f.bollingerBands <= 5 &&
      f.overallRisk !== "high" &&
      f.riskLevel < 5 &&
      f.decision !== "HOLD"
    )
      set.go = true;
  }

  if (f.overallTrend == "upward") {
    if (
      f.movingAverages > 5 &&
      f.movingAveragesConvergenceDivergence > 5 &&
      f.relativeStrengthIndex > 5 &&
      f.fibonacciRetracement >= 5 &&
      f.bollingerBands >= 5 &&
      f.overallRisk !== "high" &&
      f.riskLevel < 5 &&
      f.decision !== "HOLD"
    )
      set.go = true;
  }

  if (set.go == true) {
    actions.beginTrade(set);
  } else {
    console.log("Do not make trade");
  }

  console.log("Updating AI Data file for epic: " + set.epic);
  console.log("AI Data path: " + set.dataPath);

  //if property ai_decision exists
  if (analytics.hasOwnProperty("ai_decisions")) {
    if (analytics.ai_decisions.length == 5) {
      //reset if max 5
      analytics.ai_decisions = [];
      analytics.ai_decisions.push(f.decision);
    } else {
      //otherwise push new decision
      analytics.ai_decisions.push(f.decision);
    }
  } else {
    //if property does not exist create
    analytics.ai_decisions = [];
    analytics.ai_decisions.push(f.decision);
  }

  var ai_report = {
    results: set.results,
    findings: set.findings,
    open_position: set.go,
    epic: set.epic,
  };

  console.log(ai_report);
  console.log(set.dataPath);

  cloud.updateFile(ai_report, set.dataPath);
};

actions.beginTrade = async function (set) {
  console.log("BEGINNING TRADE USING AI...");

  //var lastClosePrice = pricedata[pricedata.length - 1];
  var dir = set.findings.decision.includes("SELL") ? "SELL" : "BUY";
  var entryPrice = dir == "SELL" ? lastCloseBid : lastCloseAsk;

  const tradeParams = {
    entryPrice: entryPrice,
    stopPercentage: 5,
    riskPercentage: 1,
    accountEquity: 10000,
    valuePerPoint: 1,
    riskRewardRatio: 2,
  };

  const tradeDetails = await actions.calculateTradeDetails(tradeParams);

  tradeDetails.direction = dir;
  tradeDetails.entryPrice = entryPrice;
  set.details = tradeDetails;
  //console.log(tradeDetails);
  actions.openPosition2(tradeDetails, set);
};

actions.calculateTradeDetails = function (params) {
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
    market.minimumSize.type == "points"
      ? market.minimumSize.value
      : lib.toNumber(cp * market.minimumSize.value);

  if (size <= minSize) size = minSize;

  console.log("calculating size:");
  console.log("value per point:");
  console.log(valuePerPoint);
  console.log("risk per trade:");
  console.log(riskPerTrade);
  console.log("stop distance:");
  console.log(stopDistance);

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

actions.runAIQuery = async function (data = false, attempt = 0, set) {
  return new Promise(async (resolve) => {
    //setTimeout(async () => {
    if (!!data) {
      //console.log(data);

      let reportJSON = {
        summary: "",
        movingAverages: 0,
        movingAveragesConvergenceDivergence: 0,
        relativeStrengthIndex: 0,
        fibonacciRetracement: 0,
        bollingerBands: 0,
        overallTrend: "",
        riskLevel: 0,
        overallRisk: "",
        decision: "",
        epic: set.epic,
      };

      const prompt =
        "Using the following five technical analysis methods: Moving Averages, MACD (Moving Average Convergence Divergence), Fibonacci Retracement, Bollinger Bands & Relative Strength Index (RSI), analyse the following JSON financial data and give me a report with a final decision on whether to BUY or SELL. Using your response, complete the blank values from the following JSON structure, and only this structure. Do no create any other properties: " +
        JSON.stringify(reportJSON) +
        ' The summary property can be a summary report in no more than 500 words. For the value of the property "movingAverage", provide a score out of 10 based on the result of the analysis method Moving Averages, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "movingAveragesConvergenceDivergence", provide a score out of 10 based on the result of the analysis method Moving Averages Convergence Divergence, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "relativeStrengthIndex", provide a score out of 10 based on the result of the analysis method Relative Strength Index, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "fibonacciRetracement", provide a score out of 10 based on the result of the analysis method Fibonacci Retracement, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "bollingerBands", provide a score out of 10 based on the result of the analysis method Bollinger Bands, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). Make sure the values for each of the analysis method properties are a score as mentioned, and no more than 10. The overallTrend property can be either "downward", "neutral", or "upward". The riskLevel can be a number 0 out of 5, with 0 being low risk and 5 being high risk. overallRisk can either be "low", "medium" or "high". The decision value can only be either BUY, STRONG BUY, SELL, STRONG SELL or HOLD. And here is the JSON financial data: ' +
        JSON.stringify(data) +
        " Do not return any other response, or additional text, only the JSON structure, with no line breaks and formatted correctly.";

      try {
        session = await actions.doAI(prompt, "gemini-pro", "json");
      } catch (e) {
        //catch if gemini throws error
        console.log(e);
      }

      if (session !== null) {
        try {
          JSON.parse(session);
          //console.log("formatted JSON");
          session = JSON.parse(session);
          //check for null values
          let pass = true;
          Object.keys(session).forEach((key) => {
            if (session[key] == null) pass = false;
          });
          if (!pass) {
            if (attempt < 1) {
              attempt++;
              session = null; //nullify this response if not json
              console.log(
                "JSON returned null values. Trying again.." +
                  attempt +
                  " epic: " +
                  set.epic,
              );
              actions.runAIQuery(data, attempt, set);
            }
          }
        } catch (e) {
          //if not json try again
          if (attempt < 1) {
            attempt++;
            session = null;
            console.log("Trying again.." + attempt);
            console.log(
              "Could not PARSE Json. Trying again.." +
                attempt +
                " epic: " +
                set.epic,
            );
            actions.runAIQuery(data, attempt, set);
          }
          console.log("could not format JSON");
        }

        //console.log(session);
        //resolve(this.session);
      } else {
        //reject('No data');
        console.log("No data provided. Cannot run AI Query");
        session = null;
      }
    } //if session not null

    resolve(session);
    // }, 60000); // Simulate an async operation with a timeout
  });
};

actions.openPosition = async function (details, set) {
  /*const createPositionResponse = await ig.createOtcPosition({
    epic: set.epic,
    direction: details.direction,
    orderType: "MARKET",
    size: details.size,
    forceOpen: true,
    guaranteedStop: false,
    stopLevel: null,
    stopDistance: details.stopDistance.toFixed(2),
    trailingStop: "true",
    trailingStopIncrement: "0",
    limitLevel: null,
    limitDistance: details.limitDistance.toFixed(2),
    currencyCode: "GBP",
    expiry: "DFB",
  });
  console.log(createPositionResponse);
  this.session = createPositionResponse;*/

  const dealStatus = await ig.checkDealStatus(
    createPositionResponse.dealReference,
  );
  console.log(dealStatus);
};

actions.openPosition2 = async function (details, set) {
  console.log("Beginning trade using AI...");

  //await notification.notify('trade-being-made', 'Trade is being made');

  //Check if we already have a position
  let positionOpen = false;

  if (!lib.isEmpty(market.deal)) {
    console.log("market deal is not empty");
    let dealId = market.deal.dealId;
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
          market.deal = {};
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
                  "deal is not empty, but no dealId found in transactions or as open position, resetting..",
                );
                market.deal = {};
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
            if (lib.isEmpty(market.deal)) {
              console.log(
                "Position found on server, but deal on marketdata is empty",
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

  if (go === true) {
    console.log("beginnign trade on epic: " + set.epic);
    console.log("trade details:");
    console.log(details);
    console.log("set:");
    console.log(set);

    //No open positions, begin trade
    ticket = {
      currencyCode: "GBP",
      direction: details.direction,
      epic: set.epic,
      expiry: market.expiry,
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
            "Checking again, and confirming position with deal ref: " + ref,
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
                  "deal success, dealId should be:" + analysis.dealId,
                );
              }
            })
            .catch((e) => {
              console.log(
                "could not confirm position with deal reference: " + ref,
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
          analysis.dealId,
      );

      //add a delay here if we are waiting for an existing trade to close (counter trade repair method)
      setTimeout(async () => {
        console.log("repairdelay: " + repairdelay);
        dealId = analysis.dealId;
        dealRef = analysis.dealReference;
        direction = analysis.ticket.direction;

        //Log trade first before monitoring
        await log.startTradeLog(set.epic, analysis, dealId);
        //await monitor.iniMonitor(dealId, dealRef, epic);
      }, repairdelay);

      market.tradedBefore = moment.utc().local().valueOf();
      finalMessage =
        "Checks passed and trade has been made. Will go again in 1 hour.";
    } else {
      await log.errorTradeLog(
        analysis.errorInformation,
        analysis.dealReference,
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
