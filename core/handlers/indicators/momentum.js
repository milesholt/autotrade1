var actions = {};

actions.calculateMomentum = async function(prices, period) {
  const smoothedCurrent = await actions.calculateSMARecent(prices.slice(-period), period);
  const smoothedPast = await actions.calculateSMARecent(prices.slice(0, -period), period);
  if (smoothedCurrent === null || smoothedPast === null) return null; // Not enough data
  return smoothedCurrent - smoothedPast;
}


