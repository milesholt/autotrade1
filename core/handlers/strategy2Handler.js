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

  const smaData = actions.calculateSMA(data, 20);

  console.log("sma data:");
  console.log(smaData);
};

// Simple Moving Average
actions.calculateSMA = async function (data, period) {
  return data.map((_, idx, arr) => {
    if (idx < period - 1) return null;
    const slice = arr.slice(idx - period + 1, idx + 1);
    return slice.reduce((acc, val) => acc + val, 0) / period;
  });
};

// Exponential Moving Average
actions.calculateEMA = async function (data, period) {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
};

// MACD
actions.calculateMACD = async function (data) {
  const ema12 = this.calculateEMA(data, 12);
  const ema26 = this.calculateEMA(data, 26);
  const macd = ema12.map((val, idx) => (val || 0) - (ema26[idx] || 0));
  const signal = this.calculateEMA(macd, 9);
  return { macd, signal };
};

// Bollinger Bands
actions.calculateBollingerBands = async function (
  data,
  period,
  stdDevMultiplier
) {
  const sma = this.calculateSMA(data, period);
  const stdDev = data.map((_, idx, arr) => {
    if (idx < period - 1) return null;
    const slice = arr.slice(idx - period + 1, idx + 1);
    const mean = slice.reduce((acc, val) => acc + val, 0) / period;
    return Math.sqrt(
      slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period
    );
  });
  const upper = sma.map((val, idx) => val + stdDev[idx] * stdDevMultiplier);
  const lower = sma.map((val, idx) => val - stdDev[idx] * stdDevMultiplier);
  return { upper, lower };
};

// Fibonacci Retracement (basic)
actions.calculateFibonacciLevels = async function (high, low) {
  const diff = high - low;
  return {
    levels: [
      high,
      high - 0.236 * diff,
      high - 0.382 * diff,
      high - 0.618 * diff,
      low,
    ],
  };
};

module.exports = {
  actions: actions,
};
