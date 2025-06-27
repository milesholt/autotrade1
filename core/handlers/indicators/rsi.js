var actions = {};

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

module.exports = {
  actions: actions,
};


