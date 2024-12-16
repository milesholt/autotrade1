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

  console.log("------------------------prices---------------------");
  console.log(prices);
  console.log('pricedata length: ' + pricedata.support.length);
};

actions.iniRunOff = async function () {
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
  //let data = pricedata.support.map((p) => p.close);

  let data = prices;
  console.log("data:");
  console.log(data);

  //const sma = await actions.calculateSMA(data, 20);
  //const macd = await actions.calculateMACD(data);
  //const bollinger = await actions.calculateBollingerBands(data, 20, 2);

  // Run the analysis
  const result = await actions.analyseSignals(data);
  console.log("Trading Signal:", result.signal);
  console.log("Certainty:", result.certainty);

  //Checks before beginning trade
  //if market.tradedBefore is set to false, it has been reset and so check is true
  //if market.tradedBefore hours is over threshold of hours (tradeBeforeHours) then check is also true
  
  tradebeforeCheck =  market.tradedBefore !== false ? moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours") >= tradeBeforeHours ? true : false : true;

  //return result;
  /*if(tradebeforeCheck == true){

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
    
    if((result.signal == 'STRONG BUY' || result.signal == 'STRONG SELL') && result.certainty >= 0.7 && tradebeforeCheck){
      console.log('Making trade...');
      set.decision = result.signal.replace('STRONG ', '');
      await actions.beginTrade(set);  
    } else {
      console.log('Did not make trade');
    }
  } else {
    console.log('Last trade was not later than ' + tradeBeforeHours + ' hours, waiting.');
  }*/
  
};


actions.analyseSignals = async function (data) {
  // Constants for weights
  const WEIGHTS = {
    SMA: 0.2,
    MACD: 0.3,
    Bollinger: 0.2,
    RSI: 0.2,
    Volume: 0.1,
    ADX: 0.1,
    Momentum: 0.1
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
  const smaValue = smaArray[smaArray.length - 1];
  if (currentPrice > smaValue) {
    buyCertainty += WEIGHTS.SMA;
    explanations.push("Price is above SMA (uptrend indication)");
  } else {
    sellCertainty += WEIGHTS.SMA;
    explanations.push("Price is below SMA (downtrend indication)");
  }

  // MACD Analysis
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

  // RSI Analysis
  if (rsi < 30) {
    buyCertainty += WEIGHTS.RSI;
    explanations.push("RSI below 30 (oversold condition)");
  } else if (rsi > 70) {
    sellCertainty += WEIGHTS.RSI;
    explanations.push("RSI above 70 (overbought condition)");
  }

  // Volume Analysis
  const averageVolume = actions.calculateAverageVolume(data);
  const currentVolume = volume[volume.length - 1];
  if (currentVolume > 1.5 * averageVolume) {
    buyCertainty += WEIGHTS.Volume;
    explanations.push("High volume supports upward price movement");
  }

  // ADX Analysis
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
  if (buyCertainty > sellCertainty && buyCertainty > 0.5) {
    signal = "BUY";
  } else if (sellCertainty > buyCertainty && sellCertainty > 0.5) {
    signal = "SELL";
  }

  return { signal, buyCertainty, sellCertainty, explanations };
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

 actions.calculateMACD = async function(data, fastPeriod, slowPeriod, signalPeriod) {
    // Calculate MACD
    const emaFast = actions.calculateEMA(data, fastPeriod);
    const emaSlow = actions.calculateEMA(data, slowPeriod);
    const macdLine = emaFast.map((val, index) => val - emaSlow[index]);
    const signalLine = actions.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((val, index) => val - signalLine[index]);
    return { macdLine, signalLine, histogram: histogram[histogram.length - 1] };
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


actions.getAverageVolume = async function(data, period) {
  if (data.length < period) {
    throw new Error("Not enough data to calculate the average volume for the specified period.");
  }

  const recentData = data.slice(data.length - period);
  const totalVolume = recentData.reduce((sum, item) => sum + item.volume, 0);
  return totalVolume / period;
};

function calculateMomentum(data, period = 14) {
    const momentum = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            momentum.push(null); // Not enough data to calculate momentum
        } else {
            const currentPrice = data[i].close;
            const previousPrice = data[i - period].close;
            momentum.push(currentPrice - previousPrice);
        }
    }

    return momentum;
};

actions.calculateEMA = function(data, period) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data must be a non-empty array.");
    }
    if (period <= 0 || period > data.length) {
        throw new Error("Invalid period. It must be greater than 0 and less than or equal to the length of the data.");
    }

    const multiplier = 2 / (period + 1);
    let ema = [];

    // Calculate the initial SMA for the first 'period' elements
    const initialSMA = data
        .slice(0, period)
        .reduce((acc, val) => acc + val, 0) / period;

    ema.push(initialSMA);

    // Calculate the EMA for the rest of the data
    for (let i = period; i < data.length; i++) {
        const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
    }

    return ema;
};


module.exports = {
  actions: actions,
};


 
