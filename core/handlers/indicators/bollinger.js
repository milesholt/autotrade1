var actions = {};

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

module.exports = {
  actions: actions,
};
