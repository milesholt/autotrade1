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

  const tradedBefore = moment.utc(market.tradedBefore).local().valueOf(); // market.tradedBefore
  const localUtcTime = moment.utc().local(); // Local UTC Time
  const tradedBeforeDate = moment(tradedBefore).format('YYYY-MM-DD HH:mm:ss'); // Example format
  const localUtcTimeDate = moment(localUtcTime).format('YYYY-MM-DD HH:mm:ss');

  //return result;
  if(tradebeforeCheck == true){

    console.log('tradebeforeCheck is true');
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
    console.log('market.tradedBefore is: ' + tradedBefore  );
    console.log('Local UTC Time is: ' + localUtcTime );
    console.log(`Traded Before Date: ${tradedBeforeDate}`);
    console.log(`Local UTC Time Date: ${localUtcTimeDate}`);
    console.log('Hours difference: ' + moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours"));
    console.log('tradeBeforeHours threshold: ' + tradeBeforeHours);
   
    
  }
  
};

actions.analyseSignals = async function (data) {

  // Make sure data is array and not empty
  if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data must be a non-empty array.");
  }

  //Split data
  const highs = data.map(point => point.high);
  const lows = data.map(point => point.low);
  const closes = data.map(point => point.close);
  
  // Constants for weights
  const WEIGHTS = {
    MA: 0.2,
    SMA10: 0.1,
    SMA20: 0.2,
    SMA50: 0.3,
    SMA70: 0.4,
    EMA10: 0.1,
    EMA20: 0.2,
    EMA50: 0.3,
    EMA70: 0.4,
    MACD: 0.3,
    Bollinger: 0.2,
    RSI: 0.2,
    Volume: 0.1,
    ADX: 0.1,
    ROC: 0.1,
    Momentum: 0.1,
    Fibonacci: 0.2
  };


  let buyCertainty = 0;
  let sellCertainty = 0;
  const explanations = [];
  const buyIndicators = [];
  const sellIndicators = [];

  // Run calculations concurrently
  const [
    smaArray10,
    smaArray20,
    smaArray50,
    smaArray70,
    emaArray10,
    emaArray20,
    emaArray50,
    emaArray70,
    macd,
    bollingerArray,
    fibonacci,
    rsi,
    volume,
    adx,
    momentum,
    atr,
    roc
  ] = await Promise.all([
    actions.calculateSMA(data, 10),
    actions.calculateSMA(data, 20),
    actions.calculateSMA(data, 50),
    actions.calculateSMA(data, 70),
    actions.calculateEMA(closes, 10),
    actions.calculateEMA(closes, 20),
    actions.calculateEMA(closes, 50),
    actions.calculateEMA(closes, 70),
    actions.calculateMACD(data, 12, 26, 9),
    actions.calculateBollingerBands(data, 20, 2),
    actions.getFibonacciLevels(data),
    actions.calculateRSI(data, 14),
    actions.getVolume(data),
    actions.calculateADX(data, 14),
    actions.calculateMomentum(closes, 14),
    actions.calculateATR(highs,lows,closes, 20),
    actions.calculateROC(closes, 14)
  ]);

  const currentPrice = data[data.length - 1].close;
  console.log('Current price:');
  console.log(currentPrice);
  
  
  // Simple (SMA) and Exponential (EMA) Moving Average Analysis
  const smaValue10 = smaArray10[smaArray10.length - 1];
  const smaValue20 = smaArray20[smaArray20.length - 1];
  const smaValue50 = smaArray50[smaArray50.length - 1];
  const smaValue70 = smaArray70[smaArray70.length - 1];

  //EMA
  const emaValue10 = emaArray10[emaArray10.length - 1];
  const emaValue20 = emaArray20[emaArray20.length - 1];
  const emaValue50 = emaArray50[emaArray50.length - 1];
  const emaValue70 = emaArray70[emaArray70.length - 1];

  console.log('sma and ema moving averges');

  let maAnalysis = {
    'SMA10': {
      'value': smaValue10,
      'signal': currentPrice > smaValue10 ? 'BUY' : 'SELL'
    },
    'SMA20': {
      'value': smaValue20,
      'signal': currentPrice > smaValue20 ? 'BUY' : 'SELL'
    },
    'SMA50': {
      'value': smaValue50,
      'signal': currentPrice > smaValue50 ? 'BUY' : 'SELL'
    },
    'SMA70': {
      'value': smaValue70,
      'signal': currentPrice > smaValue70 ? 'BUY' : 'SELL'
    },
    'EMA10': {
      'value': emaValue10,
      'signal': currentPrice > emaValue10 ? 'BUY' : 'SELL'
    },
    'EMA20': {
      'value': emaValue20,
      'signal': currentPrice > emaValue20 ? 'BUY' : 'SELL'
    },
    'EMA50': {
      'value': emaValue50,
      'signal': currentPrice > emaValue50 ? 'BUY' : 'SELL'
    },
    'EMA70': {
      'value': emaValue70,
      'signal': currentPrice > emaValue70 ? 'BUY' : 'SELL'
    }
  }

  console.log(maAnalysis);

  // Initialize weighted certainty scores
let MAbuyCertainty = 0;
let MAsellCertainty = 0;
let MAtotalWeight = 0;

// Calculate weighted certainty for each moving average
for (const key in maAnalysis) {
  const weight = WEIGHTS[key] || 0; // Use weight if defined, otherwise 0
  MAtotalWeight += weight;

  if (maAnalysis[key].signal === 'BUY') {
    MAbuyCertainty += weight;
  } else if (maAnalysis[key].signal === 'SELL') {
    MAsellCertainty += weight;
  }
}

// Normalize certainties to percentages
const MAbuyCertaintyPercentage = ((MAbuyCertainty / MAtotalWeight) * 100).toFixed(2);
const MAsellCertaintyPercentage = ((MAsellCertainty / MAtotalWeight) * 100).toFixed(2);

// Determine overall signal
const overallMASignal = MAbuyCertainty > MAsellCertainty ? 'BUY' : 'SELL';

  
// Define thresholds for confidence levels
const MAconfidenceLevels = {
  strong: 40, // Strong confidence if the difference > 40%
  moderate: 20 // Moderate confidence if the difference > 20%
};

// Calculate difference between buyCertainty and sellCertainty
const MAcertaintyDifference = Math.abs(MAbuyCertaintyPercentage - MAsellCertaintyPercentage);

// Determine confidence level
let MAconfidence = '';
if (MAcertaintyDifference > MAconfidenceLevels.strong) {
  MAconfidence = overallMASignal === 'BUY' ? 'STRONG BUY' : 'STRONG SELL';
} else if (MAcertaintyDifference > MAconfidenceLevels.moderate) {
  MAconfidence = overallMASignal === 'BUY' ? 'BUY' : 'SELL';
} else {
  MAconfidence = 'NEUTRAL';
}


// Add overall certainty to the result
maAnalysis.overallAnalysis = {
  signal: overallMASignal,
  confidence: MAconfidence,
  buyCertainty: MAbuyCertaintyPercentage + '%',
  sellCertainty: MAsellCertaintyPercentage + '%',
  totalWeight: MAtotalWeight
};

 const MAThreshold = 60;

  if(MAconfidence == 'BUY'){
    buyIndicators.push('MA');
    buyCertainty += WEIGHTS.MA;
    explanations.push("Moving Averages Analysis is BUY (uptrend indication)");
  }
  if(MAconfidence == 'SELL'){
    sellIndicators.push('MA');
    sellCertainty += WEIGHTS.MA;
    explanations.push("Moving Averages Analaysis is SELL (downtrend indication)");
  }

  if(MAconfidence == 'STRONG BUY'){
    buyIndicators.push('MA');
    buyCertainty += (WEIGHTS.MA * 2);
    explanations.push("Moving Averages Analysis is STRONG BUY (uptrend indication)");
  }
  if(MAconfidence == 'STRONG SELL'){
    sellIndicators.push('MA');
    sellCertainty += (WEIGHTS.MA * 2);
    explanations.push("Moving Averages Analysis is STRONG SELL (downtrend indication)");
  }

  console.log("SMA and EMA Moving Averages Analysis with Weighted Certainty:", maAnalysis);

// Log the full analysis
/*
  if (currentPrice > smaValue20) {
    buyCertainty += WEIGHTS.SMA20;
    explanations.push("Price is above SMA (uptrend indication)");
  } else {
    sellCertainty += WEIGHTS.SMA20;
    explanations.push("Price is below SMA (downtrend indication)");
  }*/

  // MACD Analysis
  console.log('MACD');
  console.log(macd);
  /*if (macd.histogram > 0) {
    buyCertainty += WEIGHTS.MACD;
    explanations.push("MACD histogram is positive (bullish momentum)");
  } else {
    sellCertainty += WEIGHTS.MACD;
    explanations.push("MACD histogram is negative (bearish momentum)");
  }*/

  
    // Find the most recent valid points
    const lastIndex = macd.macdLine.length - 1;
    const prevIndex = macd.macdLine.length - 2;

    if (macd.macdLine[lastIndex] > macd.signalLine[lastIndex] && macd.macdLine[prevIndex] <= macd.signalLine[prevIndex]) {
        // MACD Line just crossed above Signal Line
        buyCertainty += WEIGHTS.MACD;
        buyIndicators.push('MACD');
        explanations.push("MACDLine is above signalLine (bullish momentum)");
    } else if (macd.macdLine[lastIndex] < macd.signalLine[lastIndex] && macd.macdLine[prevIndex] >= macd.signalLine[prevIndex]) {
        // MACD Line just crossed below Signal Line
        sellCertainty += WEIGHTS.MACD;
        sellIndicators.push('MACD');
        explanations.push("MACDLine is below signalLine (bearish momentum)");
    } 



  // Bollinger Bands Analysis
  const lowerBand = bollingerArray.lower[bollingerArray.lower.length - 1];
  const upperBand = bollingerArray.upper[bollingerArray.upper.length - 1];
  if (currentPrice < lowerBand) {
    buyCertainty += WEIGHTS.Bollinger;
    buyIndicators.push('Bollinger');
    explanations.push("Price below Bollinger lower band (reversion expected)");
  } else if (currentPrice > upperBand) {
    sellCertainty += WEIGHTS.Bollinger;
    sellIndicators.push('Bollinger');
    explanations.push("Price above Bollinger upper band (overbought condition)");
  }

  // Fibonacci Levels Analysis
  console.log('Fibonacci');
  console.log(fibonacci);
  const fibLevels = fibonacci.levels;
  if (currentPrice >= fibLevels.level236 && currentPrice <= fibLevels.level382) {
    buyCertainty += WEIGHTS.Fibonacci;
    buyIndicators.push('Fibonacci');
    explanations.push("Price near Fibonacci 0.236-0.382 retracement level (potential support)");
  } else if (currentPrice >= fibLevels.level618 && currentPrice <= fibLevels.level100) {
    sellCertainty += WEIGHTS.Fibonacci;
    sellIndicators.push('Fibonacci');
    explanations.push("Price near Fibonacci 0.618-1.0 retracement level (potential resistance)");
  }

  // RSI Analysis
  console.log('RSI');
  console.log(rsi);
  /*if (rsi < 30) {
    buyCertainty += WEIGHTS.RSI;
    buyIndicators.push('RSI');
    explanations.push("RSI below 30 (oversold condition)");
  } else if (rsi > 70) {
    sellCertainty += WEIGHTS.RSI;
    sellIndicators.push('RSI');
    explanations.push("RSI above 70 (overbought condition)");
  }*/

  //Confirm RSI with MACD and Bollinger indicators
  const rsiData = {
    rsi: rsi,                      
    sellIndicators: sellIndicators,
    buyIndicators: buyIndicators
  }

  const rsiSignal = await actions.determineRSI(rsiData);

  console.log('rsiSignal');
  console.log(rsiSignal);

  if(rsiSignal.action == 'BUY'){
    buyCertainty += WEIGHTS.RSI;
    buyIndicators.push('RSI');
    explanations.push(rsiSignal.outcome);
  }

  if(rsiSignal.action == 'SELL'){
    sellCertainty += WEIGHTS.RSI;
    sellIndicators.push('RSI');
    explanations.push(rsiSignal.outcome);
  }

  // Volume Analysis
  const averageVolume = await actions.calculateAverageVolume(data);
  const currentVolume = volume[volume.length - 1];
  if (currentVolume > 1.5 * averageVolume) {
    buyCertainty += WEIGHTS.Volume;
    buyIndicators.push('Volume');
    explanations.push("High volume supports upward price movement");
  }

  // ADX Analysis
  console.log('ADX');
  console.log(adx);
  /*if (adx > 25) {
    if (macd.histogram > 0) {
      buyCertainty += WEIGHTS.ADX;
      explanations.push("ADX confirms strong bullish trend");
    } else {
      sellCertainty += WEIGHTS.ADX;
      explanations.push("ADX confirms strong bearish trend");
    }
  }*/


  

  // Momentum Analysis
  /*if (momentum > 0) {
    buyCertainty += WEIGHTS.Momentum;
    explanations.push("Positive momentum supports upward movement");
  } else {
    sellCertainty += WEIGHTS.Momentum;
    explanations.push("Negative momentum supports downward movement");
  }*/

  
  console.log("Rate of Change (ROC):", roc.toFixed(2) + "%");
  console.log("Momentum (Smoothed):", momentum.toFixed(2));
  const adjustedMomentum = momentum / atr;

  console.log("ATR:", atr.toFixed(2));
  console.log("Volatility-Adjusted Momentum:", adjustedMomentum.toFixed(2));

  // Define thresholds for momentum confidence
  //const momentumThreshold = 10; // Example threshold
  //const rocThreshold = 5;

  const baseThreshold = market.volatilityThreshold;
  const momentumThreshold = await actions.calculateDynamicThreshold(baseThreshold, atr, currentPrice);
  const rocThreshold = momentumThreshold * 0.5; // Adjust ROC threshold relative to momentum

  //ROC Analysis
  if(roc > rocThreshold){
    buyCertainty += WEIGHTS.ROC;
    buyIndicators.push('ROC');
    explanations.push("ROC above 0.5% - BUY");
  }
  if(roc < -rocThreshold){
    sellCertainty += WEIGHTS.ROC;
    sellIndicators.push('ROC');
    explanations.push("ROC less than 0.5% - SELL");
  }

  let momentumSignal = 'NEUTRAL';
  if (adjustedMomentum > momentumThreshold && roc > rocThreshold) {
    momentumSignal = 'STRONG UPTREND';
    buyCertainty += (WEIGHTS.Momentum * 2);
    buyIndicators.push('Momentum');
    explanations.push("Momentum suggests Strong Uptrend");
  } else if (adjustedMomentum > 0 && roc > 0) {
    momentumSignal = 'UPTREND';
    buyCertainty += WEIGHTS.Momentum;
    buyIndicators.push('Momentum');
    explanations.push("Momentum suggests Uptrend");
  } else if (adjustedMomentum < -momentumThreshold && roc < -rocThreshold) {
    momentumSignal = 'STRONG DOWNTREND';
    sellCertainty += (WEIGHTS.Momentum * 2);
    sellIndicators.push('Momentum');
    explanations.push("Momentum suggests Strong Downtrend");
  } else if (adjustedMomentum < 0 && roc < 0) {
    momentumSignal = 'DOWNTREND';
    sellCertainty += WEIGHTS.Momentum;
    sellIndicators.push('Momentum');
    explanations.push("Momentum suggests Downtrend");
  }
  
  console.log("Momentum Signal:", momentumSignal);

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

  console.log('Indicators');
  console.log(buyIndicators);
  console.log(sellIndicators);

  if (buyCertainty > sellCertainty) {
    const confidenceLevel = Math.abs(buyCertainty - sellCertainty);

    if (confidenceLevel > 0.7 && buyIndicators.length >= 3) {
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

    if (confidenceLevel > 0.7 && sellIndicators.length >= 3) {
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

actions.determineRSI = async function(data) {
  const { rsi, sellIndicators, buyIndicators } = data;

  let action = "HOLD"; // Default to no action
  let certainty = 0;
  let reasons = [];
  let outcome = '';

  // RSI Overbought Check (SELL Condition)
  if (rsi > 50) {
    // Confirm overbought condition using existing sellIndicators
    if (sellIndicators.includes("MACD")) {
      reasons.push("MACD indicates bearish momentum");
      certainty++;
    }
    if (sellIndicators.includes("Bollinger")) {
      reasons.push("Price above upper Bollinger Band (overbought)");
      certainty++;
    }

    // SELL if confirmed by enough indicators
    if (certainty >= 2) {
      if(rsi > 70){
        action = "SELL";
        reasons.push("Confirmed overbought condition by multiple indicators");
        outcome = 'RSI - overbought confirmed by multiple indicators';
      }
    } else {
      if(buyIndicators.includes('MA')){
        action = "BUY";
        reasons.push("Overbought not confirmed and RIS above 50. MA confirms uptrend.");
        outcome = 'RSI - Above 50, confirmed by MA uptrend.';
      }      
    }
  }

  

  // RSI Oversold Check (BUY Condition)
  if (rsi < 40) {
    // Confirm oversold condition using existing buyIndicators
    if (buyIndicators.includes("MACD")) {
      reasons.push("MACD indicates bullish momentum");
      certainty++;
    }
    if (buyIndicators.includes("Bollinger")) {
      reasons.push("Price below lower Bollinger Band (oversold)");
      certainty++;
    }

    // BUY if confirmed by enough indicators
    if (certainty >= 2) {
      if(rsi < 30){
        action = "BUY";
        reasons.push("RSI - Confirmed oversold condition by multiple indicators");
        outcome = 'RSI - Confirmed oversold';
      }
    } else {
      if(sellIndicators.includes('MA')){
        action = "SELL";
        reasons.push("Oversold not confirmed and RIS below 40. MA confirms downtrend.");
        outcome = 'RSI - Below 40, confirmed by MA downtrend.';
      }
    }
  }

  return {
    action,
    certainty,
    reasons,
    outcome
  };
}

actions.calculateDynamicThreshold = async function(baseThreshold, atrValue, currentPrice) {
  const volatilityFactor = atrValue / currentPrice; // ATR as % of price
  return baseThreshold * (1 + volatilityFactor); // Scale threshold
}

 //Returns SMA array with the period as a starting index (all data outside of the period)
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

//Returns single recent SMA value, with period as last index (all data inside of period)
actions.calculateSMARecent = async function(prices, period) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
};

// Function to calculate Rate of Change (ROC)
actions.calculateROC = async function(prices, period) {
  if (prices.length < period) return null; // Not enough data
  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - period];
  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

//Calculate ATR - To help momentum adjust for volatility
actions.calculateATR = async function(highs, lows, closes, period) {
  const trueRanges = highs.map((high, i) => {
    if (i === 0) return null; // Skip first period
    const low = lows[i];
    const prevClose = closes[i - 1];
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }).filter((tr) => tr !== null);

  return await actions.calculateSMARecent(trueRanges, period);
}


actions.calculateMomentum = async function(prices, period) {
  const smoothedCurrent = await actions.calculateSMARecent(prices.slice(-period), period);
  const smoothedPast = await actions.calculateSMARecent(prices.slice(0, -period), period);
  if (smoothedCurrent === null || smoothedPast === null) return null; // Not enough data
  return smoothedCurrent - smoothedPast;
}


/*actions.calculateMACD = async function (data, fastPeriod, slowPeriod, signalPeriod) {

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
};*/

actions.calculateMACD = async function (data, fastPeriod, slowPeriod, signalPeriod) {
   
    // Ensure the input data is valid
    if (!data || data.length < slowPeriod) {
        throw new Error("Insufficient data for calculation"); // Handle cases where there isn't enough data
    }

    // Extract closing prices from the input data
    let closePrices = data.map(d => d.close); // Assuming the input is an array of objects with 'close' property

    // Calculate the fast EMA (shorter period)
    let emaFast = await actions.calculateEMA(closePrices, fastPeriod);

    // Calculate the slow EMA (longer period)
    let emaSlow = await actions.calculateEMA(closePrices, slowPeriod);

    // Calculate MACD Line (difference between fast EMA and slow EMA)
    let macdLine = emaFast.map((value, index) => {
        if (index >= slowPeriod - 1) {
            return value - emaSlow[index];
        }
        return null; // Return null for indices where MACD Line cannot be calculated
    });

    // Filter out null values from MACD Line for further calculations
    let validMacdLine = macdLine.filter(value => value !== null);

    // Calculate the Signal Line (EMA of the MACD Line)
    // Ensure Signal Line length matches MACD Line length
    let signalLineRaw = await actions.calculateEMA(validMacdLine, signalPeriod);
    let signalLine = macdLine.map((value, index) => {
        if (index >= slowPeriod - 1 && signalLineRaw[index - (slowPeriod - 1)] !== undefined) {
            return signalLineRaw[index - (slowPeriod - 1)];
        }
        return null;
    });
   
    // Calculate the MACD Histogram (difference between MACD Line and Signal Line)
    let histogram = validMacdLine.map((value, index) => {
        if (index < signalLine.length) {
            return value - signalLine[index]; // Subtract Signal Line from MACD Line
        }
        return null; // Return null for indices where Histogram cannot be calculated
    });

    // Align the results by trimming leading null values
    return {
        macdLine: macdLine,
        signalLine: signalLine.map((value, index) => index >= slowPeriod - 1 ? value : null),
        histogram: histogram
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
    const recentData = data.slice(-24);

    // Step 2: Calculate High, Low, and Close
    const high = Math.max(...recentData.map(entry => entry.high));
    const low = Math.min(...recentData.map(entry => entry.low));
    const close = recentData[recentData.length - 1].close;

    // Step 3: Calculate Pivot Point
    // The pivot point, or average point, is the median price level for that day.
    // This means the average of the highest price, lowest price, and the most significant (recent) close price over a 24 hour period.
    const PP = (high + low + close) / 3;

    // Step 4: Calculate Fibonacci-based Support and Resistance levels
    const range = high - low;

    const supportLevels = {
        S1: PP - (range * 0.382),
        S2: PP - (range * 0.618),
        S3: PP - (range * 1.0)
    };

    const resistanceLevels = {
        R1: PP + (range * 0.382),
        R2: PP + (range * 0.618),
        R3: PP + (range * 1.0)
    };

    // Step 5: Fibonacci Retracement Levels
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
        supportLevels,
        resistanceLevels,
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


actions.calculateMomentumOld = async function (data, period = 14) {
  if (data.length <= period) {
    throw new Error("Not enough data points to calculate momentum.");
  }

  // Calculate momentum for the last data point
  const currentPrice = data[data.length - 1].close;
  const priceNPeriodsAgo = data[data.length - 1 - period].close;
  const momentum = currentPrice - priceNPeriodsAgo;

  return momentum; // Single value for the most recent point
}



actions.calculateEMA_OFF = async function (data, period) {
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


/*actions.calculateEMA = async function (prices, period) {
        
        if (!Array.isArray(prices) || prices.length === 0) {
          throw new Error("Data must be a non-empty array.");
        }
        if (period <= 0 || period > prices.length) {
          throw new Error("Invalid period. It must be greater than 0 and less than or equal to the length of the data.");
        }
  
        let multiplier = 2 / (period + 1); // Multiplier for EMA calculation
        let emaArray = [];

        // Seed the EMA with the first SMA (Simple Moving Average)
        let sma = prices.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
        emaArray[period - 1] = sma; // Initialize the EMA array with the first SMA

        // Calculate EMA for the rest of the data points
        for (let i = period; i < prices.length; i++) {
            emaArray[i] = (prices[i] - emaArray[i - 1]) * multiplier + emaArray[i - 1];
        }

        return emaArray; // Return the complete EMA array
};*/


actions.calculateEMA = async function (prices, period) {
        let multiplier = 2 / (period + 1); // Multiplier for EMA calculation
        let emaArray = [];

         if (!Array.isArray(prices) || prices.length === 0) {
          throw new Error("Data must be a non-empty array.");
        }
        if (period <= 0 || period > prices.length) {
          throw new Error("Invalid period. It must be greater than 0 and less than or equal to the length of the data.");
        }

        // Seed the EMA with the first SMA (Simple Moving Average)
        let sma = prices.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
        for (let i = 0; i < period - 1; i++) {
            emaArray[i] = null; // Fill with nulls for indices where EMA is not valid
        }
        emaArray[period - 1] = sma; // Initialize the EMA array with the first SMA

        // Calculate EMA for the rest of the data points
        for (let i = period; i < prices.length; i++) {
            emaArray[i] = (prices[i] - emaArray[i - 1]) * multiplier + emaArray[i - 1];
        }

        return emaArray; // Return the complete EMA array
    }


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


 
