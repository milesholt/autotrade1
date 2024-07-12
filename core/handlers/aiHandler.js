var actions = {};
var core;
var lib;

//Call specific service to handle ai actions
const ai = require("../services/ai.js");

/*

REQUIRE

*/

actions.require = async function () {
  core = require.main.exports;
  lib = core.lib.actions;
  cloud = core.cloudHandler.actions;
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

actions.runMultiple = async function (i) {
  console.log("running multiple");
  console.log("running AI Query: " + i);
  await actions.runAIQuery(pricedata).then(async (result) => {
    if (result !== null) ai_results.push(result);
    i++;
    if (i < 5) {
      actions.runMultiple(i);
      console.log(`Result ${i + 1}:`, result);
    } else {
      console.log("All results:", ai_results);
      await actions.analyseResults();
      actions.decide();
    }
  });
};

actions.analyseResults = async function () {
  // Loop through the array
  ai_results.forEach((item) => {
    if (typeof item === "object" && item !== null) {
      for (const key in item) {
        if (!Array.isArray(ai_findings[key])) {
          ai_findings[key] = [];
        }
        ai_findings[key].push(item[key]);
      }
    }
  });

  // Remove 'summary' property
  if (ai_findings["summary"]) {
    delete ai_findings["summary"];
  }

  // Calculate the average for arrays containing only numbers
  for (const key in ai_findings) {
    const values = ai_findings[key];
    // Get average for arrays with numbers
    if (values.every((value) => typeof value === "number")) {
      const sum = values.reduce((acc, val) => acc + val, 0);
      ai_findings[key] = Math.round(sum / values.length);
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
        ai_findings[key] = mostFrequentStrings[0];
      }
    }
  }
};

actions.decide = async function () {
  ai_go = false;
  console.log(ai_findings);
  let f = ai_findings;

  if (f.overallTrend == "downward") {
    if (
      f.movingAverages < 5 &&
      f.movingAveragesConvergenceDivergence < 5 &&
      f.relativeStrengthIndex < 5 &&
      f.fibonacciRetracement <= 5 &&
      f.bollingerBands <= 5 &&
      f.overallRisk !== "high" &&
      f.riskLevel < 5 &&
      f.decision !== "CAUTION"
    )
      ai_go = true;
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
      f.decision !== "CAUTION"
    )
      ai_go = true;
  }

  if (ai_go == true) {
    actions.beginTrade();
  } else {
    console.log("Do not make trade");
  }

  var ai_report = {
    results: ai_results,
    findings: ai_findings,
    open_position: ai_go,
  };

  cloud.updateFile(ai_report, aiDataDir);
};

actions.beginTrade = async function () {
  console.log("BEGINNING TRADE USING AI...");

  //var lastClosePrice = pricedata[pricedata.length - 1];
  var dir = ai_findings.decision.includes("SELL") ? "SELL" : "BUY";
  var entryPrice = dir == "SELL" ? lastCloseBid : lastCloseAsk;

  const tradeParams = {
    entryPrice: entryPrice,
    stopPercentage: 5,
    riskPercentage: 1,
    accountEquity: 10000,
    valuePerPoint: 1,
    riskRewardRatio: 2,
  };

  const tradeDetails = actions.calculateTradeDetails(tradeParams);
  console.log(tradeDetails);
  //this.openPosition(tradeDetails);
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
  const positionSize = riskPerTrade / (stopDistance * valuePerPoint);

  return {
    stopDistance,
    stopLossPrice,
    limitDistance,
    takeProfitPrice,
    positionSize,
  };
};

actions.runAIQuery = async function (data = false, attempt = 0) {
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
      };

      const prompt =
        "Using the following five technical analysis methods: Moving Averages, MACD (Moving Average Convergence Divergence), Fibonacci Retracement, Bollinger Bands & Relative Strength Index (RSI), analyse the following JSON financial data and give me a report with a final decision on whether to BUY or SELL. Using your response, complete the blank values from the following JSON structure, and only this structure. Do no create any other properties: " +
        JSON.stringify(reportJSON) +
        ' The summary property can be a summary report in no more than 500 words. For the value of the property "movingAverage", provide a score out of 10 based on the result of the analysis method Moving Averages, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "movingAveragesConvergenceDivergence", provide a score out of 10 based on the result of the analysis method Moving Averages Convergence Divergence, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "relativeStrengthIndex", provide a score out of 10 based on the result of the analysis method Relative Strength Index, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "fibonacciRetracement", provide a score out of 10 based on the result of the analysis method Fibonacci Retracement, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). For the value of the property "bollingerBands", provide a score out of 10 based on the result of the analysis method Bollinger Bands, (with 0 being the strongest indication of the stock price going down and 10 being the highest indication of the stock price going up). Make sure the values for each of the analysis method properties are a score as mentioned, and no more than 10. The overallTrend property can be either "downward", "neutral", or "upward". The riskLevel can be a number 0 out of 5, with 0 being low risk and 5 being high risk. overallRisk can either be "low", "medium" or "high". The decision needs to be BUY, STRONG BUY, SELL, STRONG SELL or NEUTRAL. If the overallRisk is "high" the decision should be CAUTION. And here is the JSON financial data: ' +
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
          console.log("formatted JSON");
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
              console.log("Trying again.." + attempt);
              actions.runAIQuery(data, attempt);
            }
          }
        } catch (e) {
          //if not json try again
          if (attempt < 1) {
            attempt++;
            session = null;
            console.log("Trying again.." + attempt);
            actions.runAIQuery(data, attempt);
          }
          console.log("could not format JSON");
        }

        console.log(session);
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

module.exports = {
  actions: actions,
};
