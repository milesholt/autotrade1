var actions = {};

//Tools

var macd = require('./macd.js');
var atr = require('./atr.js');
var momentum = require('./momentum.js');
var ema = require('./ema.js');
var sma = require('./sma.js');
var fibonacci = require('./fibonacci.js');
var bollinger = require('./bollinger.js');
var rsi = require('./rsi.js');

actions.doTechnicalAnalysis(prices){
    
  const rsiSignal = await actions.determineRSI(rsiData);
  if(rsiSignal.action == 'BUY'){
    buyCertainty += WEIGHTS.RSI;
    buyIndicators.push('RSI');
    explanations.push(rsiSignal.outcome);
  }

  if(rsiSignal.action == 'SELL'){
    sellCertainty += WEIGHTS.RSI;
    sellIndicators.push('RSI');
    explanations.push(rsiSignal.outcome);
  }

  // Volume Analysis
  const averageVolume = await actions.calculateAverageVolume(data);
  const currentVolume = volume[volume.length - 1];
  
  // Define which indicators are relevant for volume-confirmed moves
  const volumeConfirmedBuyIndicators = ['MACD', 'Momentum'];
  const volumeConfirmedSellIndicators = ['MACD', 'Momentum'];
  
  // High volume can confirm a potential BUY signal
  if (
    currentVolume > 1.5 * averageVolume &&
    volumeConfirmedBuyIndicators.some(indicator => buyIndicators.includes(indicator))
  ) {
    buyCertainty += WEIGHTS.Volume;
    buyIndicators.push('Volume');
    explanations.push("High volume supports upward price movement");
  }
  
  // High volume can confirm a potential SELL signal
  if (
    currentVolume > 1.5 * averageVolume &&
    volumeConfirmedSellIndicators.some(indicator => sellIndicators.includes(indicator))
  ) {
    sellCertainty += WEIGHTS.Volume;
    sellIndicators.push('Volume');
    explanations.push("High volume supports downward price movement");
  }

  // ADX Analysis
  /*if (adx > 25) {
    if (macd.histogram > 0) {
      buyCertainty += WEIGHTS.ADX;
      explanations.push("ADX confirms strong bullish trend");
    } else {
      sellCertainty += WEIGHTS.ADX;
      explanations.push("ADX confirms strong bearish trend");
    }
  }*/

  // Momentum Analysis
  const adjustedMomentum = momentum / atr;

  // Define thresholds for momentum confidence
  const baseThreshold = market.volatilityThreshold;
  const momentumThreshold = await actions.calculateDynamicThreshold(baseThreshold, atr, currentPrice);
  const rocThreshold = momentumThreshold * 0.5; // Adjust ROC threshold relative to momentum

  //ROC Analysis
  if(roc > rocThreshold){
    buyCertainty += WEIGHTS.ROC;
    buyIndicators.push('ROC');
    explanations.push("ROC above 0.5% - BUY");
  }
  if(roc < -rocThreshold){
    sellCertainty += WEIGHTS.ROC;
    sellIndicators.push('ROC');
    explanations.push("ROC less than 0.5% - SELL");
  }

  let momentumSignal = 'NEUTRAL';
  if (adjustedMomentum > momentumThreshold && roc > rocThreshold) {
    momentumSignal = 'STRONG UPTREND';
    buyCertainty += (WEIGHTS.Momentum * 2);
    buyIndicators.push('Momentum');
    explanations.push("Momentum suggests Strong Uptrend");
  } else if (adjustedMomentum > 0 && roc > 0) {
    momentumSignal = 'UPTREND';
    buyCertainty += WEIGHTS.Momentum;
    buyIndicators.push('Momentum');
    explanations.push("Momentum suggests Uptrend");
  } else if (adjustedMomentum < -momentumThreshold && roc < -rocThreshold) {
    momentumSignal = 'STRONG DOWNTREND';
    sellCertainty += (WEIGHTS.Momentum * 2);
    sellIndicators.push('Momentum');
    explanations.push("Momentum suggests Strong Downtrend");
  } else if (adjustedMomentum < 0 && roc < 0) {
    momentumSignal = 'DOWNTREND';
    sellCertainty += WEIGHTS.Momentum;
    sellIndicators.push('Momentum');
    explanations.push("Momentum suggests Downtrend");
  }
  
  // Normalize certainties
  const totalCertainty = buyCertainty + sellCertainty;
  buyCertainty = totalCertainty > 0 ? buyCertainty / totalCertainty : 0;
  sellCertainty = totalCertainty > 0 ? sellCertainty / totalCertainty : 0;

  // Determine signal
  let signal = "HOLD";
  let confidence = "Neutral";
  
  if (buyCertainty > sellCertainty) {
    const confidenceLevel = Math.abs(buyCertainty - sellCertainty);

    if (confidenceLevel > 0.7 && buyIndicators.length >= 3) {
      signal = "BUY";
      confidence = "Strong";
    } else if (confidenceLevel > 0.4) {
      signal = "BUY";
      confidence = "Moderate";
    } else {
      signal = "BUY";
      confidence = "Weak";
    }
  } else if (sellCertainty > buyCertainty) {
    const confidenceLevel = Math.abs(sellCertainty - buyCertainty);

    if (confidenceLevel > 0.7 && sellIndicators.length >= 3) {
      signal = "SELL";
      confidence = "Strong";
    } else if (confidenceLevel > 0.4) {
      signal = "SELL";
      confidence = "Moderate";
    } else {
      signal = "SELL";
      confidence = "Weak";
    }
  }


  return { signal, confidence, buyCertainty, sellCertainty, explanations };

  
}

module.exports = {
  actions: actions
};
