var actions = {};

actions.calculateADX = async function(data, period) {
  const trArray = []; // True Range values
  const plusDMArray = []; // +DM values
  const minusDMArray = []; // -DM values

  // Calculate True Range (TR), +DM, and -DM for each period
  for (let i = 1; i < data.length; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    const previousClose = data[i - 1].close;

    const trueRange = Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - previousClose),
      Math.abs(currentLow - previousClose)
    );
    trArray.push(trueRange);

    const plusDM = currentHigh - data[i - 1].high > data[i - 1].low - currentLow 
      ? Math.max(currentHigh - data[i - 1].high, 0) 
      : 0;
    plusDMArray.push(plusDM);

    const minusDM = data[i - 1].low - currentLow > currentHigh - data[i - 1].high
      ? Math.max(data[i - 1].low - currentLow, 0)
      : 0;
    minusDMArray.push(minusDM);
  }

  // Calculate smoothed TR, +DM, and -DM using Wilder's smoothing method
  const smoothedTR = [];
  const smoothedPlusDM = [];
  const smoothedMinusDM = [];

  // Initialize the first smoothed value
  smoothedTR[0] = trArray.slice(0, period).reduce((sum, value) => sum + value, 0);
  smoothedPlusDM[0] = plusDMArray.slice(0, period).reduce((sum, value) => sum + value, 0);
  smoothedMinusDM[0] = minusDMArray.slice(0, period).reduce((sum, value) => sum + value, 0);

  // Apply smoothing for the rest of the values
  for (let i = period; i < trArray.length; i++) {
    smoothedTR.push(smoothedTR[smoothedTR.length - 1] - smoothedTR[smoothedTR.length - 1] / period + trArray[i]);
    smoothedPlusDM.push(smoothedPlusDM[smoothedPlusDM.length - 1] - smoothedPlusDM[smoothedPlusDM.length - 1] / period + plusDMArray[i]);
    smoothedMinusDM.push(smoothedMinusDM[smoothedMinusDM.length - 1] - smoothedMinusDM[smoothedMinusDM.length - 1] / period + minusDMArray[i]);
  }

  // Calculate the +DI and -DI
  const plusDI = smoothedPlusDM.map((value, index) => (value / smoothedTR[index]) * 100);
  const minusDI = smoothedMinusDM.map((value, index) => (value / smoothedTR[index]) * 100);

  // Calculate the DX (Directional Movement Index)
  const dxArray = plusDI.map((value, index) => {
    const difference = Math.abs(plusDI[index] - minusDI[index]);
    const sum = plusDI[index] + minusDI[index];
    return (sum !== 0) ? (difference / sum) * 100 : 0;
  });

  // Smooth the DX values to calculate the ADX
  const adxArray = [];
  adxArray[0] = dxArray.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < dxArray.length; i++) {
    adxArray.push((adxArray[adxArray.length - 1] * (period - 1) + dxArray[i]) / period);
  }

  // Return the most recent ADX value
  return adxArray[adxArray.length - 1];
};

module.exports = {
  actions: actions
}

