
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
