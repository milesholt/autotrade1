var actions = {};
var sma = require('./sma.js');

actions.calculateMomentum = async function(prices, period) {
  const smoothedCurrent = await sma.actions.calculateSMARecent(prices.slice(-period), period);
  const smoothedPast = await sma.actions.calculateSMARecent(prices.slice(0, -period), period);
  if (smoothedCurrent === null || smoothedPast === null) return null; // Not enough data
  return smoothedCurrent - smoothedPast;
}

module.exports = {
  actions: actions,
};
