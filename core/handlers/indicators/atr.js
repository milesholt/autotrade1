var actions = {};

actions.calculateATR = async function(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;

  let trValues = [];

  for (let i = 1; i <= period; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const highLow = current.high - current.low;
    const highClose = Math.abs(current.high - previous.close);
    const lowClose = Math.abs(current.low - previous.close);

    const trueRange = Math.max(highLow, highClose, lowClose);
    trValues.push(trueRange);
  }

  const atr = trValues.reduce((sum, tr) => sum + tr, 0) / period;
  return parseFloat(atr.toFixed(5));
};
