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

  console.log('------- RUNNING STRATEGY2 HANDLER ON EPIC: ' + market.epic + ' -------------');
  
  //console.log("------------------------prices---------------------");
  //console.log('prices length: ' + prices.length);
  //console.log('pricedata length: ' + pricedata.support.length);
  //price length is 71 (3 days)

  // Iterate through the arrays
  pricedata.support.forEach((item, index) => {
    item.volume = prices[index].lastTradedVolume;
  });

  /*
  {
    price: 2654.47,
    open: 2655.15,
    close: 2654.47,
    high: 2657.09,
    low: 2650.79,
    diff: 1,
    time: '2024-12-16 15:00:00',
    closeAsk: 2654.62,
    closeBid: 2654.32,
    volume: 11277
  }*/

  

  let data = pricedata.support;

  // Run the analysis
  const result = await actions.analyseSignals(data);
  console.log('signal result from strategy2Handler2:');
  console.log(result);


   //Checks before beginning trade
  //if market.tradedBefore is set to false, it has been reset and so check is true
  //if market.tradedBefore hours is over threshold of hours (tradeBeforeHours) then check is also true
  
  tradebeforeCheck =  market.tradedBefore !== false ? moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours") >= tradeBeforeHours ? true : false : true;

  //return result;
  if(tradebeforeCheck == true){

    console.log('tradebeforeCheck is true');
    
    const tradedBefore = moment.utc(market.tradedBefore).local().valueOf(); // market.tradedBefore
    const localUtcTime = moment.utc().local(); // Local UTC Time
    const tradedBeforeDate = moment(tradedBefore).format('YYYY-MM-DD HH:mm:ss'); // Example format
    const localUtcTimeDate = moment(localUtcTime).format('YYYY-MM-DD HH:mm:ss');

    console.log('market.tradedBefore is: ' + tradedBefore  );
    console.log('Local UTC Time is: ' + localUtcTime );
    console.log(`Traded Before Date: ${tradedBeforeDate}`);
    console.log(`Local UTC Time Date: ${localUtcTimeDate}`);
    
    console.log('Hours difference: ' + moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours"));
    console.log('tradeBeforeHours threshold: ' + tradeBeforeHours);
    
    if((result.signal == 'BUY' || result.signal == 'SELL') && result.confidence == 'Strong' && tradebeforeCheck){
      console.log('Making trade...');
      set.decision = result.signal;
      await actions.beginTrade(set);  
    } else {
      console.log('Did not make trade');
    }
  } else {
    console.log('Last trade was not later than ' + tradeBeforeHours + ' hours, waiting.');
  }
  
};

actions.analyseSignals = async function (data) {

  // Make sure data is array and not empty
  if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data must be a non-empty array.");
  }
  
  // Constants for weights
  const WEIGHTS = {
    SMA: 0.2,
    MACD: 0.3,
    Bollinger: 0.2,
    RSI: 0.2,
    Volume: 0.1,
    ADX: 0.1,
    Momentum: 0.1,
    Fibonacci: 0.2
  };

  let buyCertainty = 0;
  let sellCertainty = 0;
  const explanations = [];

  // Run calculations concurrently
  const [
    smaArray,
    macd,
    bollingerArray,
    fibonacci,
    rsi,
    volume,
    adx,
    momentum
  ] = await Promise.all([
    actions.calculateSMA(data, 20),
    actions.calculateMACD(data, 12, 26, 9),
    actions.calculateBollingerBands(data, 20, 2),
    actions.getFibonacciLevels(data),
    actions.calculateRSI(data, 14),
    actions.getVolume(data),
    actions.calculateADX(data, 14),
    actions.calculateMomentum(data, 10)
  ]);

  // Simple Moving Average (SMA) Analysis
  const currentPrice = data[data.length - 1].close;

  console.log('Current price:');
  console.log(currentPrice);
  
  const smaValue = smaArray[smaArray.length - 1];
  console.log('SMA');
  console.log(smaValue);
  
  if (currentPrice > smaValue) {
    buyCertainty += WEIGHTS.SMA;
    explanations.push("Price is above SMA (uptrend indication)");
  } else {
    sellCertainty += WEIGHTS.SMA;
    explanations.push("Price is below SMA (downtrend indication)");
  }

  // MACD Analysis
  console.log('MACD');
  console.log(macd);
  if (macd.histogram > 0) {
    buyCertainty += WEIGHTS.MACD;
    explanations.push("MACD histogram is positive (bullish momentum)");
  } else {
    sellCertainty += WEIGHTS.MACD;
    explanations.push("MACD histogram is negative (bearish momentum)");
  }

  // Bollinger Bands Analysis
  const lowerBand = bollingerArray.lower[bollingerArray.lower.length - 1];
  const upperBand = bollingerArray.upper[bollingerArray.upper.length - 1];
  if (currentPrice < lowerBand) {
    buyCertainty += WEIGHTS.Bollinger;
    explanations.push("Price below Bollinger lower band (reversion expected)");
  } else if (currentPrice > upperBand) {
    sellCertainty += WEIGHTS.Bollinger;
    explanations.push("Price above Bollinger upper band (overbought condition)");
  }

  // Fibonacci Levels Analysis
  console.log('Fibonacci');
  console.log(fibonacci);
  const fibLevels = fibonacci.levels;
  if (currentPrice >= fibLevels.level236 && currentPrice <= fibLevels.level382) {
    buyCertainty += WEIGHTS.Fibonacci;
    explanations.push("Price near Fibonacci 0.236-0.382 retracement level (potential support)");
  } else if (currentPrice >= fibLevels.level618 && currentPrice <= fibLevels.level100) {
    sellCertainty += WEIGHTS.Fibonacci;
    explanations.push("Price near Fibonacci 0.618-1.0 retracement level (potential resistance)");
  }

  // RSI Analysis
  console.log('RSI');
  console.log(rsi);
  if (rsi < 30) {
    buyCertainty += WEIGHTS.RSI;
    explanations.push("RSI below 30 (oversold condition)");
  } else if (rsi > 70) {
    sellCertainty += WEIGHTS.RSI;
    explanations.push("RSI above 70 (overbought condition)");
  }

  // Volume Analysis
  const averageVolume = await actions.calculateAverageVolume(data);
  const currentVolume = volume[volume.length - 1];
  if (currentVolume > 1.5 * averageVolume) {
    buyCertainty += WEIGHTS.Volume;
    explanations.push("High volume supports upward price movement");
  }

  // ADX Analysis
  console.log('ADX');
  console.log(adx);
  if (adx > 25) {
    if (macd.histogram > 0) {
      buyCertainty += WEIGHTS.ADX;
      explanations.push("ADX confirms strong bullish trend");
    } else {
      sellCertainty += WEIGHTS.ADX;
      explanations.push("ADX confirms strong bearish trend");
    }
  }

  // Momentum Analysis
  if (momentum > 0) {
    buyCertainty += WEIGHTS.Momentum;
    explanations.push("Positive momentum supports upward movement");
  } else {
    sellCertainty += WEIGHTS.Momentum;
    explanations.push("Negative momentum supports downward movement");
  }

  // Normalize certainties
  const totalCertainty = buyCertainty + sellCertainty;
  buyCertainty = totalCertainty > 0 ? buyCertainty / totalCertainty : 0;
  sellCertainty = totalCertainty > 0 ? sellCertainty / totalCertainty : 0;

  // Determine signal
  let signal = "HOLD";
  let confidence = "Neutral";
  
  /*if (buyCertainty > sellCertainty && buyCertainty > 0.5) {
    signal = "BUY";
  } else if (sellCertainty > buyCertainty && sellCertainty > 0.5) {
    signal = "SELL";
  }*/

  if (buyCertainty > sellCertainty) {
    const confidenceLevel = Math.abs(buyCertainty - sellCertainty);

    if (confidenceLevel > 0.7) {
      signal = "BUY";
      confidence = "Strong";
    } else if (confidenceLevel > 0.4) {
      signal = "BUY";
      confidence = "Moderate";
    } else {
      signal = "BUY";
      confidence = "Weak";
    }
  } else if (sellCertainty > buyCertainty) {
    const confidenceLevel = Math.abs(sellCertainty - buyCertainty);

    if (confidenceLevel > 0.7) {
      signal = "SELL";
      confidence = "Strong";
    } else if (confidenceLevel > 0.4) {
      signal = "SELL";
      confidence = "Moderate";
    } else {
      signal = "SELL";
      confidence = "Weak";
    }
  }


  return { signal, confidence, buyCertainty, sellCertainty, explanations };
};

// New helper functions
 actions.calculateSMA = async function(data, period) {
    // Calculate Simple Moving Average
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, item) => sum + item.close, 0) / period;
      sma.push(avg);
    }
    return sma;
  };

actions.calculateMACD = async function (data, fastPeriod, slowPeriod, signalPeriod) {

  // Extract the 'close' property for MACD calculation
  const closePrices = data.map(item => {
        if (item && typeof item.close === 'number') {
            return item.close;
        } else {
            throw new Error("Invalid data format. Each item must have a numeric 'close' property.");
        }
  });
  
  // Ensure periods are valid
    if (fastPeriod >= slowPeriod) {
        throw new Error("Fast period must be smaller than slow period.");
    }

    // Calculate EMA arrays
    const emaFast = await actions.calculateEMA(closePrices, fastPeriod);
    const emaSlow = await actions.calculateEMA(closePrices, slowPeriod);

    // Trim emaFast and emaSlow to the same length
    const minLength = Math.min(emaFast.length, emaSlow.length);
    const trimmedEmaFast = emaFast.slice(-minLength);
    const trimmedEmaSlow = emaSlow.slice(-minLength);

    // Calculate MACD Line
    const macdLine = trimmedEmaFast.map((val, index) => val - trimmedEmaSlow[index]);

    // Calculate Signal Line (ensure macdLine has enough valid data)
    const signalLine = await actions.calculateEMA(macdLine.slice(signalPeriod - 1), signalPeriod);

    // Trim macdLine to align with signalLine
    const alignedMacdLine = macdLine.slice(-(signalLine.length));

    // Calculate Histogram
    const histogram = alignedMacdLine.map((val, index) => val - signalLine[index]);


  return {
    macdLine,
    signalLine,
    histogram: histogram[histogram.length - 1],
  };
};

  actions.calculateBollingerBands = async function(data, period, multiplier) {
    const sma = await actions.calculateSMA(data, period);
    const stdDev = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((sum, item) => sum + Math.pow(item.close - mean, 2), 0) / period;
      stdDev.push(Math.sqrt(variance));
    }

    const upper = sma.map((val, index) => val + multiplier * stdDev[index]);
    const lower = sma.map((val, index) => val - multiplier * stdDev[index]);
    return { upper, lower };
  };

actions.getFibonacciLevelsOld = async function (data) {
  
  if (!data || data.length === 0 || !Array.isArray(data)) {
    throw new Error("Data array is empty or invalid.");
  }

  // Extract the high and low prices from the dataset
  const high = Math.max(...data.map(item => item.high));
  const low = Math.min(...data.map(item => item.low));

  // Calculate the Fibonacci levels
  const diff = high - low;
  const levels = {
    level0: low,
    level236: low + 0.236 * diff,
    level382: low + 0.382 * diff,
    level50: low + 0.5 * diff,
    level618: low + 0.618 * diff,
    level100: high
  };

  return {
    high,
    low,
    levels
  };
};

actions.getFibonacciLevels = async function (data) {
if (!Array.isArray(data) || data.length < 24) {
        throw new Error("Insufficient data. At least 24 hourly entries required.");
    }

    // Step 1: Get the last 24 data points (most recent day)
    const recentData = data.slice(-24); // Last 24 points

    // Step 2: Calculate High, Low, and Close
    const high = Math.max(...recentData.map(entry => entry.high));
    const low = Math.min(...recentData.map(entry => entry.low));
    const close = recentData[recentData.length - 1].close; // Final hour's close

    // Step 3: Calculate Pivot Point
    const PP = (high + low + close) / 3

    // Step 4: Calculate Fibonacci-based Support and Resistance levels
    const range = high - low;

    const R1 = PP + (range * 0.382);
    const R2 = PP + (range * 0.618);
    const R3 = PP + (range * 1.0);

    const S1 = PP - (range * 0.382);
    const S2 = PP - (range * 0.618);
    const S3 = PP - (range * 1.0);

  const levels = {
    level0: low,
    level236: low + 0.236 * range,
    level382: low + 0.382 * range,
    level50: low + 0.5 * range,
    level618: low + 0.618 * range,
    level786: low + 0.786 * range,
    level100: high
  };

    // Step 6: Return results
    return {
        high,
        low,
        close,
        pivotPoint: PP,
        supportLevels: { S1, S2, S3 },
        resistanceLevels: { R1, R2, R3 },
        levels
    };
};

  actions.calculateRSI = async function(data, period) {
    const gains = [];
    const losses = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(-change);
      }
    }

    const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    const rsiArray = [];
    let prevAvgGain = avgGain;
    let prevAvgLoss = avgLoss;

    for (let i = period; i < gains.length; i++) {
      const currentGain = gains[i];
      const currentLoss = losses[i];
      const smoothedGain = (prevAvgGain * (period - 1) + currentGain) / period;
      const smoothedLoss = (prevAvgLoss * (period - 1) + currentLoss) / period;

      const rs = smoothedLoss === 0 ? 100 : smoothedGain / smoothedLoss;
      const rsi = 100 - 100 / (1 + rs);
      rsiArray.push(rsi);

      prevAvgGain = smoothedGain;
      prevAvgLoss = smoothedLoss;
    }

    return rsiArray[rsiArray.length - 1];
  };

  actions.getVolume = async function(data) {
    return data.map((item) => item.volume);
  };

 actions.calculateADX = async function(data, period) {
  const trArray = []; // True Range values
  const plusDMArray = []; // +DM values
  const minusDMArray = []; // -DM values

  // Calculate True Range (TR), +DM, and -DM for each period
  for (let i = 1; i < data.length; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    const previousClose = data[i - 1].close;

    const trueRange = Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - previousClose),
      Math.abs(currentLow - previousClose)
    );
    trArray.push(trueRange);

    const plusDM = currentHigh - data[i - 1].high > data[i - 1].low - currentLow 
      ? Math.max(currentHigh - data[i - 1].high, 0) 
      : 0;
    plusDMArray.push(plusDM);

    const minusDM = data[i - 1].low - currentLow > currentHigh - data[i - 1].high
      ? Math.max(data[i - 1].low - currentLow, 0)
      : 0;
    minusDMArray.push(minusDM);
  }

  // Calculate smoothed TR, +DM, and -DM using Wilder's smoothing method
  const smoothedTR = [];
  const smoothedPlusDM = [];
  const smoothedMinusDM = [];

  // Initialize the first smoothed value
  smoothedTR[0] = trArray.slice(0, period).reduce((sum, value) => sum + value, 0);
  smoothedPlusDM[0] = plusDMArray.slice(0, period).reduce((sum, value) => sum + value, 0);
  smoothedMinusDM[0] = minusDMArray.slice(0, period).reduce((sum, value) => sum + value, 0);

  // Apply smoothing for the rest of the values
  for (let i = period; i < trArray.length; i++) {
    smoothedTR.push(smoothedTR[smoothedTR.length - 1] - smoothedTR[smoothedTR.length - 1] / period + trArray[i]);
    smoothedPlusDM.push(smoothedPlusDM[smoothedPlusDM.length - 1] - smoothedPlusDM[smoothedPlusDM.length - 1] / period + plusDMArray[i]);
    smoothedMinusDM.push(smoothedMinusDM[smoothedMinusDM.length - 1] - smoothedMinusDM[smoothedMinusDM.length - 1] / period + minusDMArray[i]);
  }

  // Calculate the +DI and -DI
  const plusDI = smoothedPlusDM.map((value, index) => (value / smoothedTR[index]) * 100);
  const minusDI = smoothedMinusDM.map((value, index) => (value / smoothedTR[index]) * 100);

  // Calculate the DX (Directional Movement Index)
  const dxArray = plusDI.map((value, index) => {
    const difference = Math.abs(plusDI[index] - minusDI[index]);
    const sum = plusDI[index] + minusDI[index];
    return (sum !== 0) ? (difference / sum) * 100 : 0;
  });

  // Smooth the DX values to calculate the ADX
  const adxArray = [];
  adxArray[0] = dxArray.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < dxArray.length; i++) {
    adxArray.push((adxArray[adxArray.length - 1] * (period - 1) + dxArray[i]) / period);
  }

  // Return the most recent ADX value
  return adxArray[adxArray.length - 1];
};


actions.calculateAverageVolume = async function(data, period) {
  if (data.length < period) {
    throw new Error("Not enough data to calculate the average volume for the specified period.");
  }

  const recentData = data.slice(data.length - period);
  const totalVolume = recentData.reduce((sum, item) => sum + item.volume, 0);
  return totalVolume / period;
};


actions.calculateMomentum = async function (data, period = 14) {
  if (data.length <= period) {
    throw new Error("Not enough data points to calculate momentum.");
  }

  // Calculate momentum for the last data point
  const currentPrice = data[data.length - 1].close;
  const priceNPeriodsAgo = data[data.length - 1 - period].close;
  const momentum = currentPrice - priceNPeriodsAgo;

  return momentum; // Single value for the most recent point
}



actions.calculateEMA = async function (data, period) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data must be a non-empty array.");
    }
    if (period <= 0 || period > data.length) {
        throw new Error("Invalid period. It must be greater than 0 and less than or equal to the length of the data.");
    }

    const multiplier = 2 / (period + 1);
    let ema = [];

    // Validate data points and filter invalid values
    const validData = data.filter(val => typeof val === 'number' && !isNaN(val));
    if (validData.length < period) {
        throw new Error("Insufficient valid data points to calculate EMA.");
    }

    // Calculate the initial SMA for the first 'period' elements
    const initialSMA = validData
        .slice(0, period)
        .reduce((acc, val) => acc + val, 0) / period;

    ema.push(initialSMA);

    // Calculate the EMA for the rest of the data
    for (let i = period; i < validData.length; i++) {
        const currentEMA =
            (validData[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
    }

    return ema;
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

  //Original parameters for opening a trade, but distance was too large
  /*const tradeParams = {
    entryPrice: entryPrice,
    stopPercentage: 5,
    riskPercentage: 1,
    accountEquity: 10000,
    valuePerPoint: 1,
    riskRewardRatio: 2,
  };*/

  //Suggested parameters for scalping
  const tradeParams = {
  entryPrice: entryPrice,  // Depends on market conditions at entry
  stopPercentage: 1,       // Tight stop (0.5% - 1% for scalping)
  riskPercentage: 0.5,     // Small risk (0.25% - 1% of account equity)
  accountEquity: 10000,    // Account balance for calculation (this stays the same)
  valuePerPoint: 1,        // Assuming a low value per point for smaller trades
  riskRewardRatio: 2,      // 1:2 risk/reward ratio for favorable returns
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


 
