var actions = {};
var core;
var lib;
var loop;
var notification;
var api;
var monitor;
var util;
var log;
var lib;
var error;
var moment;

//Call specific service to handle ai actions
//const ai = require("../services/ai.js");
const indicators = require('./indicators/indicators.js');

/*

REQUIRE

*/

actions.require = async function () {
  core = require.main.exports;
  lib = core.lib.actions;
  cloud = core.cloudHandler.actions;
  loop = core.loopHandler.actions.loop;
  notification = core.notificationHandler.actions;
  log = core.log.actions;
  api = core.api;
  check = core.checkHandler.actions;
  monitor = core.monitor.actions;
  error = core.errorHandler.actions;
  util = core.util;
  moment = core.moment;
};

actions.iniRun = async function () {
  var set = {
    epic: market.epic,
    dataPath: aiDataDir,
    prices: prices,
    results: [],
    findings: {},
    go: false,
    output: {},
    lastCloseBid: lastCloseBid,
    lastCloseAsk: lastCloseAsk,
    marketidx: mid,
  };

  console.log('------- RUNNING STRATEGY3 HANDLER ON EPIC: ' + market.epic + ' -------------');

  pricedata.support.forEach((item, index) => {
    item.volume = prices[index].lastTradedVolume;
  });
  
  let data = pricedata.support;
  let data4hr = pricedata4hr.support;
  

  // Run the analysis
  const result = await actions.doStrategy3(data, data4hr);

  //Plot analysis
  await actions.plotAnalysisChart(data, result);
  
  console.log('signal result from strategy3Handler:');
  console.log(result);
  
  tradebeforeCheck =  market.tradedBefore !== false ? moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours") >= tradeBeforeHours ? true : false : true;
  const tradedBefore = moment.utc(market.tradedBefore).local().valueOf(); // market.tradedBefore
  const localUtcTime = moment.utc().local(); // Local UTC Time
  const tradedBeforeDate = moment(tradedBefore).format('YYYY-MM-DD HH:mm:ss'); // Example format
  const localUtcTimeDate = moment(localUtcTime).format('YYYY-MM-DD HH:mm:ss');
  
  //We will also get the last closed trade from the api
  let lastTrades = await check.checkLastClosedTrades();

  //Filter last by instrumentName
  let lastTrade = null;
  if(lastTrades.length) lastTrade = lastTrades.filter((m) => m.instrumentName == market.instrumentName)[0]; 
  
  //check for null or undefined by using !=
  if(lastTrade != null){
    console.log('Found last closed trade', lastTrade);
    
    const lastClosedTime = moment.utc(lastTrade.dateUtc ?? lastTrade.date).local().valueOf();
    market.tradedBefore = lastClosedTime;
    const lastDiffHours = localUtcTime.diff(lastClosedTime, "hours");

    console.log('lastClosedTime', lastClosedTime);
    console.log('Difference in hours', lastDiffHours + ' hours');

    tradebeforeCheck = lastDiffHours >= tradeBeforeHours;
    
  }


  let day = moment.utc().local().format('ddd');
  if( day == 'Sat' || day == 'Sun'){
    console.log('Should be the weekend. Day is: ' + day);
    console.log('Not beginning trade because it is the weekend and markets will be closed.');
    return false;
  }

  //return result;
  if(tradebeforeCheck == true){

    console.log('tradebeforeCheck is true');
    console.log('market.tradedBefore is: ' + tradedBefore  );
    console.log('Local UTC Time is: ' + localUtcTime );
    console.log(`Traded Before Date: ${tradedBeforeDate}`);
    console.log(`Local UTC Time Date: ${localUtcTimeDate}`);
    
    console.log('Hours difference: ' + moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours"));
    console.log('tradeBeforeHours threshold: ' + tradeBeforeHours);
    
    if((result.signal == 'BUY' || result.signal == 'SELL') && (result.confidence == 'Strong' || result.confidence == 'Moderate') && tradebeforeCheck){
      console.log('Making trade...');
      set.decision = result.signal;

      //If the first two weeks is the same as previous two weeks (which is roughly a month, set as the latest direction for the month
      //Otherwise if first two weeks differ or go in the opposite direction as previous two weeks, count as ranging
      var month4Hours = (market.data.trend4Hours == market.data.prevtrend4Hours ? market.data.trend4Hours : 'ranging');

      var t = {
        week1: market.data.midtrend4Hours,
        weeks2: market.data.trend4Hours,
        prev2weeks: market.data.prevtrend4Hours,
        month: month4Hours     
      }

       //Logic, we want to open a trade that's following a wider trend and not changing direction
      //So in this case, we only open a trade when the signal aligns with wider trendlines using 4 hour trends
      //This also tries to hold when the market might be ranging on a higher scale or have high volatility

      var condition1 = result.signal == 'BUY' && (t.week1 == 'ranging' || t.weeks2 == 'bullish') && t.month == 'bullish';
      var condition2 = result.signal == 'BUY' && (t.week1 == 'bullish' || t.weeks2 == 'ranging') && t.month == 'bullish';
      var condition3 = result.signal == 'SELL' && (t.week1 == 'ranging' || t.weeks2 == 'bearish') && t.month == 'bearish';
      var condition4 = result.signal == 'SELL' && (t.week1 == 'bearish' || t.weeks2 == 'ranging') && t.month == 'bearish';

      //If last two weeks (4 hour trend) in same direction
      var condition5 = result.signal == 'SELL' && t.weeks2 == 'bearish';
      var condition6 = result.signal == 'BUY' && t.weeks2 == 'bullish';

      //Exclude these conditions because it suggests the market might be changing direction 
      var exclusion1 = result.signal == 'BUY' && t.week1 == 'ranging' && t.weeks2 == 'ranging' && t.month == 'bullish';
      var exclusion2 = result.signal == 'SELL' && t.week1 == 'ranging' && t.weeks2 == 'ranging' && t.month == 'bearish';
      
      //var goAhead = (condition1 || condition2 || condition3 || condition4 || condition5 || condition6) && (!exclusion1 && !exclusion2);
      
      //ensure 4hour timeframe aligns with hourly timeframe - market is moving in right direction, confirmed by 4 hour timeframe.
      var goAhead = (condition5 || condition6);

      //let goAhead = true;
      
      //Log signal and whether to make a trade or not, to be used by monitor as to wether to continue trading
      markets[set.marketidx].data.strategy3 = {
          result: result,
          makeTrade: goAhead,
          ticket: {}
      };

      if (goAhead) {

          console.log('4 hours trends confirmed direction of trade. Going ahead');
          console.log(t);
        
          // Proceed with trade
          await actions.openPosition(result, set, result.takeProfit1);
          await actions.openPosition(result, set, result.takeProfit2);
                
       } else {
          console.log('Did not make trade, because 4 hour trends didnt confirm');
          console.log(t); 
       }

      
          } else {
      console.log('Did not make trade');
    }
  } else {
    console.log('Last trade was not later than ' + tradeBeforeHours + ' hours, waiting.');
    console.log('market.tradedBefore is: ' + tradedBefore  );
    console.log('Local UTC Time is: ' + localUtcTime );
    console.log(`Traded Before Date: ${tradedBeforeDate}`);
    console.log(`Local UTC Time Date: ${localUtcTimeDate}`);
    console.log('Hours difference: ' + moment.utc().local().diff(moment.utc(market.tradedBefore).local().valueOf(), "hours"));
    console.log('tradeBeforeHours threshold: ' + tradeBeforeHours);
      
  }  
};

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

  function calcAtr(data, period = 14) {
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

  const analysis1 = await indicators.actions.doAnalysis(hourlyCandles);
  console.log('analysis1', analysis1);
  
  const closes = hourlyCandles.map(c => c.close);
  const ema10 = ema(hourlyCandles, 10);
  const ema50 = ema(hourlyCandles, 50);
  const ma200 = sma(hourlyCandles, 200);
  const atrVals = calcAtr(hourlyCandles, 14);
  const stdDevs = stdDev(hourlyCandles, 20);

  // === Determine Trend Bias
  const trendBias = ema10[ema10.length - 1] > ema50[ema50.length - 1] ? "BUY" : "SELL";
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
  const trend4h = ema4h[ema4h.length - 1] > ema4h[ema4h.length - 5] ? "BUY" : "SELL";
  const directionAgreement = trendBias === trend4h;

  // === Entry price and SL/TP
  const entry = closes[closes.length - 1];
  const recentHigh = Math.max(...hourlyCandles.slice(-10).map(c => c.high));
  const recentLow = Math.min(...hourlyCandles.slice(-10).map(c => c.low));
  const atr = atrVals[atrVals.length - 1] || 0.001;

  const stopLoss = trendBias === "BUY"
    ? recentLow - atr * 1.2
    : recentHigh + atr * 1.2;

  const risk = Math.abs(entry - stopLoss);
 /* const takeProfit1 = trendBias === "BUY" ? entry + risk * 1.5 : entry - risk * 1.5;
  const takeProfit2 = trendBias === "BUY" ? entry + risk * 3 : entry - risk * 3;
*/

  const takeProfit1 = trendBias === "BUY" ? entry + risk * 1 : entry - risk * 1;
  const takeProfit2 = trendBias === "BUY" ? entry + risk * 2 : entry - risk * 2;


  
  // === Confidence Scoring ===
  let score = 0;
  if (trendBias === 'up' && ema10[ema10.length - 1] > ema50[ema50.length - 1]) score++;
  if ((trendBias === 'up' && aboveMa200) || (trendBias === 'down' && !aboveMa200)) score++;
  if (reversalPattern) score++;
  if (!contraction) score++;
  if (isPullback) score++;
  if (directionAgreement) score++;

  const confidence =
    score <= 2 ? 'Weak' :
    score <= 4 ? 'Moderate' : 'Strong';


  // === Final decision
  const validEntry =
    justReversed &&
    directionAgreement &&
    (trendBias === "up" ? aboveMa200 : !aboveMa200);

  return {
    openPosition: validEntry,
    signal: trendBias,
    confidence,
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

actions.plotAnalysisChart = async function(candles, analysis) {
  const timestamps = candles.map((_, i) => new Date(Date.now() - (candles.length - i) * 60 * 60 * 1000));
  const opens = candles.map(c => c.open);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  // Moving averages
  function sma(data, period) {
    return data.map((_, i, arr) =>
      i >= period - 1 ? arr.slice(i - period + 1, i + 1).reduce((sum, d) => sum + d.close, 0) / period : null
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

  function stdDev(data, period = 20) {
    return data.map((_, i) => {
      if (i < period) return null;
      const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
      return Math.sqrt(variance);
    });
  }

  const ema10 = ema(candles, 10);
  const ema50 = ema(candles, 50);
  const ma200 = sma(candles, 200);
  const stdDevs = stdDev(candles, 20);

  // === Trace setup ===

  const traceCandles = {
    x: timestamps,
    open: opens,
    high: highs,
    low: lows,
    close: closes,
    type: 'candlestick',
    name: 'Candles',
    increasing: { line: { color: 'green' } },
    decreasing: { line: { color: 'red' } }
  };

  const traceEMA10 = {
    x: timestamps,
    y: ema10,
    type: 'scatter',
    mode: 'lines',
    name: 'EMA 10',
    line: { color: '#33aaff' }
  };

  const traceEMA50 = {
    x: timestamps,
    y: ema50,
    type: 'scatter',
    mode: 'lines',
    name: 'EMA 50',
    line: { color: '#aa33ff' }
  };

  const traceMA200 = {
    x: timestamps,
    y: ma200,
    type: 'scatter',
    mode: 'lines',
    name: 'MA 200',
    line: { color: '#ffaa00' }
  };

  // Volatility zones (contraction in gray)
  const volZones = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'markers',
    name: 'Contraction Zone',
    marker: { color: 'gray', size: 4, opacity: 0.4 }
  };

  stdDevs.forEach((std, i) => {
    if (std && std < 0.5) {
      volZones.x.push(timestamps[i]);
      volZones.y.push(closes[i]);
    }
  });

  // Support and resistance lines (from swing highs/lows)
  function findSR(data, lookback = 20) {
    let support = [], resistance = [];
    for (let i = lookback; i < data.length - lookback; i++) {
      const slice = data.slice(i - lookback, i + lookback + 1);
      const low = Math.min(...slice.map(d => d.low));
      const high = Math.max(...slice.map(d => d.high));

      if (data[i].low === low) support.push({ x: timestamps[i], y: low });
      if (data[i].high === high) resistance.push({ x: timestamps[i], y: high });
    }
    return { support, resistance };
  }

  const { support, resistance } = findSR(candles, 10);
  const srSupport = {
    x: support.map(p => p.x),
    y: support.map(p => p.y),
    type: 'scatter',
    mode: 'markers',
    name: 'Support',
    marker: { color: 'green', symbol: 'circle-open', size: 6 }
  };

  const srResistance = {
    x: resistance.map(p => p.x),
    y: resistance.map(p => p.y),
    type: 'scatter',
    mode: 'markers',
    name: 'Resistance',
    marker: { color: 'red', symbol: 'cross-thin-open', size: 6 }
  };

  // Entry & TP/SL Lines
  function line(name, price, color, dash = 'dot') {
    return {
      x: [timestamps[0], timestamps[timestamps.length - 1]],
      y: [price, price],
      type: 'scatter',
      mode: 'lines',
      name,
      line: { color, dash }
    };
  }

  const levelLines = [];
  if (analysis.entry) levelLines.push(line("Entry", analysis.entry, "blue"));
  if (analysis.stopLoss) levelLines.push(line("Stop Loss", analysis.stopLoss, "red", "dash"));
  if (analysis.takeProfit1) levelLines.push(line("Take Profit 1", analysis.takeProfit1, "green"));
  if (analysis.takeProfit2) levelLines.push(line("Take Profit 2", analysis.takeProfit2, "darkgreen"));

  /*strategy3PlotData = [
            traceCandles,
            traceEMA10,
            traceEMA50,
            volZones,
            srSupport,
            srResistance,
            ...levelLines
          ]*/

  strategy3PlotData = [
    traceCandles
  ];

}

actions.openPosition = async function(details,set,limit){

    //No open positions, begin trade
    ticket = {
      currencyCode: "GBP",
      direction: details.signal,
      epic: set.epic,
      expiry: markets[set.marketidx].expiry,
      size: 0.5, //divide lot size by 2
      forceOpen: true,
      orderType: "MARKET",
      level: null,
      limitDistance: null,
      limitLevel: limit,
      stopDistance: null,
      stopLevel: details.stopLoss,
      guaranteedStop: false,
      timeInForce: "FILL_OR_KILL",
      trailingStop: null,
      trailingStopIncrement: null,
    };

    let go = true;

    //Check existing trades
    await api
    .showOpenPositions()
    .then(async (positionsData) => {
      //console.log(util.inspect(positionsData, false, null));
      if (positionsData.positions.length > 0) {
        console.log('Existing trade still open, skipping openPosition');
        go = false;
      }
    })
    .catch((e) => console.log(e));

   if(go === false) return;

    
    //Open a ticket for take profits
    await api
      .deal(ticket)
      .then(async (r) => {
        
        let ref = r.positions.dealReference;
        console.log('Opening position response');
        console.log(util.inspect(r, false, null));
        
      }).catch((e) => {
        console.log('Error opening position', e);
      });
};

module.exports = {
  actions: actions,
};

