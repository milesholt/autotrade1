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

actions.determineRSI = async function(data) {
  const { rsi, sellIndicators, buyIndicators } = data;

  let action = "HOLD"; // Default to no action
  let certainty = 0;
  let reasons = [];
  let outcome = '';

  // RSI Overbought Check (SELL Condition)
  if (rsi > 50) {
    // Confirm overbought condition using existing sellIndicators
    if (sellIndicators.includes("MACD")) {
      reasons.push("MACD indicates bearish momentum");
      certainty++;
    }
    if (sellIndicators.includes("Bollinger")) {
      reasons.push("Price above upper Bollinger Band (overbought)");
      certainty++;
    }

    // SELL if confirmed by enough indicators
    if (certainty >= 2) {
      if(rsi > 70){
        action = "SELL";
        reasons.push("Confirmed overbought condition by multiple indicators");
        outcome = 'RSI - overbought confirmed by multiple indicators';
      }
    } else {
      if(buyIndicators.includes('MA')){
        action = "BUY";
        reasons.push("Overbought not confirmed and RIS above 50. MA confirms uptrend.");
        outcome = 'RSI - Above 50, confirmed by MA uptrend.';
      }      
    }
  }

  // RSI Oversold Check (BUY Condition)
  if (rsi < 40) {
    // Confirm oversold condition using existing buyIndicators
    if (buyIndicators.includes("MACD")) {
      reasons.push("MACD indicates bullish momentum");
      certainty++;
    }
    if (buyIndicators.includes("Bollinger")) {
      reasons.push("Price below lower Bollinger Band (oversold)");
      certainty++;
    }

    // BUY if confirmed by enough indicators
    if (certainty >= 2) {
      if(rsi < 30){
        action = "BUY";
        reasons.push("RSI - Confirmed oversold condition by multiple indicators");
        outcome = 'RSI - Confirmed oversold';
      }
    } else {
      if(sellIndicators.includes('MA')){
        action = "SELL";
        reasons.push("Oversold not confirmed and RIS below 40. MA confirms downtrend.");
        outcome = 'RSI - Below 40, confirmed by MA downtrend.';
      }
    }
  }

  return {
    action,
    certainty,
    reasons,
    outcome
  };
}


module.exports = {
  actions: actions,
};


