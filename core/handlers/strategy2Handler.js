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
  const result = await this.actions.analyseSignals(data);
  console.log("Trading Signal:", result.signal);
  console.log("Certainty:", result.certainty);
};

// Helper function: Simple Moving Average
actions.calculateSMA = async function (data, period) {
  return data.map((_, idx, arr) => {
    if (idx < period - 1) return null; // Not enough data for SMA
    const slice = arr.slice(idx - period + 1, idx + 1);
    return slice.reduce((sum, value) => sum + value, 0) / period;
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
  const emaShort = await this.actions.calculateEMA(data, shortPeriod);
  const emaLong = await this.actions.calculateEMA(data, longPeriod);
  const macdLine = emaShort.map((val, idx) => (val || 0) - (emaLong[idx] || 0));
  const signalLine = await this.actions.calculateEMA(
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
  const sma = await this.actions.calculateSMA(data, period);
  const bands = sma.map((mean, idx) => {
    if (mean === null) return { upper: null, lower: null };
    const slice = data.slice(idx - period + 1, idx + 1);
    const stdDev = Math.sqrt(
      slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    );
    return {
      upper: mean + multiplier * stdDev,
      lower: mean - multiplier * stdDev,
    };
  });
  return bands;
};

// Helper function: Fibonacci Levels
actions.getFibonacciLevels = async function (data) {
  const high = Math.max(...data);
  const low = Math.min(...data);
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const levels = ratios.map((ratio) => high - (high - low) * ratio);
  const currentPrice = data.at(-1);
  const support = levels.filter((level) => level < currentPrice).at(-1) || null;
  const resistance =
    levels.filter((level) => level > currentPrice).at(0) || null;
  return { high, low, currentPrice, support, resistance };
};

// Decision-making function: Analyse Signals
actions.analyseSignals = async function (data) {
  const sma = await this.actions.calculateSMA(data, 20).at(-1); // Last SMA value
  const macd = await this.actions.calculateMACD(data, 12, 26, 9);
  const bollinger = await this.actions
    .calculateBollingerBands(data, 20, 2)
    .at(-1);
  const fibonacci = await this.actions.getFibonacciLevels(data);

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
  const macdTrend = macd.histogram.at(-1);
  if (macdTrend > 0) {
    signal = "BUY";
    certainty += 0.4;
  } else if (macdTrend < 0) {
    signal = "SELL";
    certainty += 0.4;
  }

  // Bollinger Bands
  if (bollinger.lower && data.at(-1) < bollinger.lower) {
    signal = "BUY";
    certainty += 0.3;
  }
  if (bollinger.upper && data.at(-1) > bollinger.upper) {
    signal = "SELL";
    certainty += 0.3;
  }

  // Default to HOLD if certainty is too low
  if (certainty < 0.5) {
    signal = "HOLD";
  }

  return { signal, certainty };
};

module.exports = {
  actions: actions,
};
