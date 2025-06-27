var actions = {};

//Tools

var macd = require('./macd.js');
var atr = require('./atr.js');
var momentum = require('./momentum.js');
var ema = require('./ema.js');
var sma = require('./sma.js');
var fibonacci = require('./fibonacci.js');
var bollinger = require('./bollinger.js');
var rsi = require('./rsi.js');

actions.doTechnicalAnalysis(prices){
  
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

  
}

module.exports = {
  actions: actions
};
