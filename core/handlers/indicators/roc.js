var actions = {};

actions.calculateROC = async function(prices, period) {
  if (prices.length < period) return null; // Not enough data
  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - period];
  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

module.exports = {
  actions : actions,
}

