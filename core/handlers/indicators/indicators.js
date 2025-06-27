var actions = {};

//Tools

var i_macd = require('./macd.js');
var i_atr = require('./atr.js');
var i_momentum = require('./momentum.js');
var i_ema = require('./ema.js');
var i_sma = require('./sma.js');
var i_fibonacci = require('./fibonacci.js');
var i_bollinger = require('./bollinger.js');
var i_rsi = require('./rsi.js');
var i_volume = require('./volume.js');
var i_roc = require('./roc.js');
var i_adx = require('./adx.js');

actions.doTechnicalAnalysis(data){
    
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
    MA: 0.3,
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
    ROC: 0.2,
    Momentum: 0.2,
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
    i_sma.actions.calculateSMA(data, 10),
    i_sma.actions.calculateSMA(data, 20),
    i_sma.actions.calculateSMA(data, 50),
    i_sma.actions.calculateSMA(data, 70),
    i_ema.actions.calculateEMA(closes, 10),
    i_ema.actions.calculateEMA(closes, 20),
    i_ema.actions.calculateEMA(closes, 50),
    i_ema.actions.calculateEMA(closes, 70),
    i_macd.actions.calculateMACD(data, 12, 26, 9),
    i_bollinger.actions.calculateBollingerBands(data, 20, 2),
    i_fibonacci.actions.getFibonacciLevels(data),
    i_rsi.actions.calculateRSI(data, 14),
    i_volume.actions.getVolume(data),
    i_adx.actions.calculateADX(data, 14),
    i_momentum.actions.calculateMomentum(closes, 14),
    i_atr.actions.calculateATR(highs,lows,closes, 20),
    i_roc.actions.calculateROC(closes, 14)
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

  //MACD Analysis
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

  //Confirm RSI with MACD and Bollinger indicators
  const rsiData = {
    rsi: rsi,                      
    sellIndicators: sellIndicators,
    buyIndicators: buyIndicators
  }

  const rsiSignal = await actions.determineRSI(rsiData);
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
  
  // Define which indicators are relevant for volume-confirmed moves
  const volumeConfirmedBuyIndicators = ['MACD', 'Momentum'];
  const volumeConfirmedSellIndicators = ['MACD', 'Momentum'];
  
  // High volume can confirm a potential BUY signal
  if (
    currentVolume > 1.5 * averageVolume &&
    volumeConfirmedBuyIndicators.some(indicator => buyIndicators.includes(indicator))
  ) {
    buyCertainty += WEIGHTS.Volume;
    buyIndicators.push('Volume');
    explanations.push("High volume supports upward price movement");
  }
  
  // High volume can confirm a potential SELL signal
  if (
    currentVolume > 1.5 * averageVolume &&
    volumeConfirmedSellIndicators.some(indicator => sellIndicators.includes(indicator))
  ) {
    sellCertainty += WEIGHTS.Volume;
    sellIndicators.push('Volume');
    explanations.push("High volume supports downward price movement");
  }

  // ADX Analysis
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
  const adjustedMomentum = momentum / atr;

  // Define thresholds for momentum confidence
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
  
  // Normalize certainties
  const totalCertainty = buyCertainty + sellCertainty;
  buyCertainty = totalCertainty > 0 ? buyCertainty / totalCertainty : 0;
  sellCertainty = totalCertainty > 0 ? sellCertainty / totalCertainty : 0;

  // Determine signal
  let signal = "HOLD";
  let confidence = "Neutral";
  
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
}

module.exports = {
  actions: actions
};
