const actions = {};

actions.doStrategy3 = async function (hourlyCandles, fourHourCandles) {
  // === Utility functions ===
  function sma(data, period) {
    return data.map((_, i) =>
      i >= period - 1
        ? data.slice(i - period + 1, i + 1).reduce((sum, c) => sum + c.close, 0) / period
        : null
    );
  }

  function ema(data, period) {
    const k = 2 / (period + 1);
    const result = [data[0].close];
    for (let i = 1; i < data.length; i++) {
      result.push((data[i].close - result[i - 1]) * k + result[i - 1]);
    }
    return result;
  }

  function atr(data, period = 14) {
    return data.map((_, i) => {
      if (i === 0 || i < period) return null;
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      const atrSlice = data.slice(i - period + 1, i + 1).map((c, j, a) => {
        return Math.max(
          c.high - c.low,
          Math.abs(c.high - (a[j - 1]?.close || c.high)),
          Math.abs(c.low - (a[j - 1]?.close || c.low))
        );
      });
      return atrSlice.reduce((a, b) => a + b, 0) / period;
    });
  }

  function stdDev(data, period = 20) {
    return data.map((_, i) => {
      if (i < period) return null;
      const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      return Math.sqrt(variance);
    });
  }

  function detectEngulfing(candles) {
    const [prev, curr] = candles.slice(-2);
    const isBullish = prev.close < prev.open && curr.close > curr.open &&
      curr.close > prev.open && curr.open < prev.close;
    const isBearish = prev.close > prev.open && curr.close < curr.open &&
      curr.open > prev.close && curr.close < prev.open;
    return isBullish ? "bullish" : isBearish ? "bearish" : null;
  }

  function detectHammer(candles) {
    const last = candles[candles.length - 1];
    const body = Math.abs(last.open - last.close);
    const range = last.high - last.low;
    const lowerWick = Math.min(last.open, last.close) - last.low;
    return lowerWick > body * 2 && body < range * 0.3
      ? (last.close > last.open ? "bullish" : "bearish")
      : null;
  }

  // === Indicator Calculation ===
  const closes = hourlyCandles.map(c => c.close);
  const ema10 = ema(hourlyCandles, 10);
  const ema50 = ema(hourlyCandles, 50);
  const ma200 = sma(hourlyCandles, 200);
  const atrVals = atr(hourlyCandles, 14);
  const stdDevs = stdDev(hourlyCandles, 20);

  // === Determine Trend Bias
  const trendBias = ema10[ema10.length - 1] > ema50[ema50.length - 1] ? "up" : "down";
  const aboveMa200 = closes[closes.length - 1] > ma200[ma200.length - 1];

  // === Check Contraction/Expansion
  const volNow = stdDevs[stdDevs.length - 1] || 0;
  const avgVolPast = stdDevs.slice(-20, -5).filter(v => v).reduce((a, b) => a + b, 0) / 15;
  const contraction = volNow < avgVolPast * 0.8;

  // === Pullback check: price moved against trend recently
  const isPullback = trendBias === "up"
    ? closes.slice(-6).some(c => c < ema50[ema50.length - 6])
    : closes.slice(-6).some(c => c > ema50[ema50.length - 6]);

  // === Reversal confirmation
  const engulfing = detectEngulfing(hourlyCandles);
  const hammer = detectHammer(hourlyCandles);
  const reversalPattern = engulfing || hammer;
  const justReversed = !!reversalPattern && isPullback && !contraction;

  // === Confirm 4H Trend using EMA slope
  const ema4h = ema(fourHourCandles, 20);
  const trend4h = ema4h[ema4h.length - 1] > ema4h[ema4h.length - 5] ? "up" : "down";
  const directionAgreement = trendBias === trend4h;

  // === Entry price and SL/TP
  const entry = closes[closes.length - 1];
  const recentHigh = Math.max(...hourlyCandles.slice(-10).map(c => c.high));
  const recentLow = Math.min(...hourlyCandles.slice(-10).map(c => c.low));
  const atr = atrVals[atrVals.length - 1] || 0.001;

  const stopLoss = trendBias === "up"
    ? recentLow - atr * 1.2
    : recentHigh + atr * 1.2;

  const risk = Math.abs(entry - stopLoss);
  const takeProfit1 = trendBias === "up" ? entry + risk * 1.5 : entry - risk * 1.5;
  const takeProfit2 = trendBias === "up" ? entry + risk * 3 : entry - risk * 3;

  // === Final decision
  const validEntry =
    justReversed &&
    directionAgreement &&
    (trendBias === "up" ? aboveMa200 : !aboveMa200);

  return {
    openPosition: validEntry,
    direction: trendBias,
    reason: {
      trendBias,
      aboveMa200,
      reversalPattern,
      isPullback,
      exitingExpansion: !contraction,
      fourHourTrend: trend4h,
      entryConfirmed: validEntry
    },
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2
  };
};
