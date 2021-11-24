//Checks
check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true; check13 = false; check14 = false; check15 = false;
//checks = [check0,check2,check6,check7,check8,check9,check10,check11,check12,check13,check14,check15]

checks = {
  '___4HoursNotRanging': {'is':false, 'enabled':true}, //check14
  '___noBumpInRange': {'is':true, 'enabled':true}, //check11
  '___noVolatileGap': {'is':false, 'enabled':true}, //check10
  '___breakingThroughRange': {'is':false, 'enabled':true}, //check8
  '___withinTradeThreshold': {'is':true, 'enabled':true}, //check9
  '___beforeRangeTrendNotBroken': {'is':false, 'enabled':false}, //check13
  '___recentTrendSameAsTrend': {'is':false, 'enabled':true}, //check6
  '___beforeRangeSameAsTrend': {'is':false, 'enabled':false}, //check7
  '___rangeConfirmationsGreaterThanLimit': {'is':false, 'enabled':true}, //check2
  '___rangeAreaGood': {'is':false, 'enabled':true}, //check0
  '___enoughWaves': {'is':false, 'enabled':true}, //check15
  '___notTradedBefore': {'is':false, 'enabled':true}, //check12
  '___enoughConfirmations': {'is':false, 'enabled':true},
  '___recentTrendPivoting':{'is':true, 'enabled':true}, // overridden for now / disabled
  '___lastCloseAboveBelowLines':{'is':false, 'enabled':true},
  '___beforeRangeSameAs4HourTrend':{'is':false, 'enabled':false},
  '___recentTrendSameAs4HourTrend':{'is':false, 'enabled':true},
  '___noBumpVolatility':{'is':true, 'enabled':true},
  '___nolastPriceVolatile':{'is':true, 'enabled':true}
}


/*

check0 -  isRangeAreaGood
check2 - isRangeConfirmationsGreaterThanLimit
check6 - isRecentTrendSameAsTrend
check7 - isBeforeRangeSameAsTrend
check8 - isBreakingThroughRange
check9 - isWithinTradeThreshold
check10 - isNoVolatileGap
check11 - noBumpInRange
check12 - notTradedBefore
check13 - isBeforeRangeTrendNotBroken
check14 - is4HoursNotRanging
check15 - enoughWaves

*/

//Main limits
momentLimitPerc = 0.1;
rangeLimitPerc = 0.45;
tradeLimitPerc = 0.3;
lineDistanceLimitPerc = 0.05;
limitDistancePerc = 0.4;
limitClosePerc = 0.75;
stopClosePerc = 0.95;
bumpVolatilityLimit = 0.6;

momentumLimit = 0;
rangelimit = 0;
tradelimit = 0;
linedistancelimit = 0;

//Specific Strategy Limits
breakoutMaxMargin = 0.17;

stopDistanceFluctuationPerc = 0.1;
recentlimit = 4;
recentrangelimit =  5;
rangeConfirmationLimit = 12;
confirmationlimit = 3;
missingHoursLimit = 3;
tradeBeforeHours = 8;
bumpgrouplimit = 5;
bumpVolatilityDiff = 0;
bumpVolatilityPerc = 0;
bumpVolatilityIndex = 0;
size = 1;
stopDistance = 0;
stopDistanceLevel = 0;
limitDistance = 0;
limitDistanceLevel = 0;

//Main parameters
// markets = [
//   //{'id':0, 'alias':'stellar', 'epic' : 'CS.D.XLMUSD.TODAY.IP', 'data': {}, 'deal' : {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.08', 'minimumStop' : {'value': 0.01, 'type': 'percent'} },
//   // {'id':1, 'alias': 'NEO', 'epic': 'CS.D.NEOUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false }
//   //{'id':1, 'alias': 'Ripple', 'epic': 'CS.D.XRPUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 10, 'type': 'points'}  }
//   {'id':0, 'alias': 'Volatility Index', 'epic': 'CC.D.VIX.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 5  },
//   {'id':1, 'alias': 'MXNJPY', 'epic': 'CS.D.MXNJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2,'minimumStop' : {'value': null, 'type': 'points'}, 'size': 5  },
//   //{"id":2, "alias": "Spot Platinum", "epic": "CS.D.PLAT.TODAY.IP", "data": {}, "deal": {}, "tradedbefore" : false, "stopDistancePerc" : "0.85", "minimumStop" : {"value": 10, "type": "points"}  }
//   {"id":2, "alias": "Spot Gold", "epic": "CS.D.USCGC.TODAY.IP", "data": {}, "deal": {}, "tradedBefore" : false, "stopDistancePerc" : 0.4, 'limitDistancePerc' : 0.2, "minimumStop" : {"value": null, "type": "points"}, 'size': 5   },
//   {'id':3, 'alias': 'Chicago Wheat', 'epic': 'CC.D.W.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 5   },
// //  {'id':4, 'alias': 'INRJPY', 'epic': 'CS.D.INRJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 2, 'type': 'points'}  },
//   {'id':4, 'alias': 'London Gas Oil', 'epic': 'CC.D.LGO.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 5  },
// ];

//AUGUST TEST - 1:1.5 risk:reward
// markets = [
//   //{'id':0, 'alias':'stellar', 'epic' : 'CS.D.XLMUSD.TODAY.IP', 'data': {}, 'deal' : {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.08', 'minimumStop' : {'value': 0.01, 'type': 'percent'} },
//   // {'id':1, 'alias': 'NEO', 'epic': 'CS.D.NEOUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false }
//   //{'id':1, 'alias': 'Ripple', 'epic': 'CS.D.XRPUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 10, 'type': 'points'}  }
//   {'id':0, 'alias': 'Volatility Index', 'epic': 'CC.D.VIX.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.6, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 2  },
//   {'id':1, 'alias': 'MXNJPY', 'epic': 'CS.D.MXNJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.6,'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
//   //{"id":2, "alias": "Spot Platinum", "epic": "CS.D.PLAT.TODAY.IP", "data": {}, "deal": {}, "tradedbefore" : false, "stopDistancePerc" : "0.85", "minimumStop" : {"value": 10, "type": "points"}  }
//   {"id":2, "alias": "Spot Gold", "epic": "CS.D.USCGC.TODAY.IP", "data": {}, "deal": {}, "tradedBefore" : false, "stopDistancePerc" : 0.4, 'limitDistancePerc' : 0.6, "minimumStop" : {"value": null, "type": "points"}, 'size': 1   },
//   {'id':3, 'alias': 'Chicago Wheat', 'epic': 'CC.D.W.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.6, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1   },
// //  {'id':4, 'alias': 'INRJPY', 'epic': 'CS.D.INRJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 2, 'type': 'points'}  },
//   {'id':4, 'alias': 'London Gas Oil', 'epic': 'CC.D.LGO.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.6, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
// ];


//SEPTEMBER TEST - 1:1 risk:reward
//markets = [
  //{'id':0, 'alias':'stellar', 'epic' : 'CS.D.XLMUSD.TODAY.IP', 'data': {}, 'deal' : {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.08', 'minimumStop' : {'value': 0.01, 'type': 'percent'} },
  // {'id':1, 'alias': 'NEO', 'epic': 'CS.D.NEOUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false }
  //{'id':1, 'alias': 'Ripple', 'epic': 'CS.D.XRPUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 10, 'type': 'points'}  }
  //{'id':0, 'alias': 'Volatility Index', 'epic': 'CC.D.VIX.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.4, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 2  },
  //{'id':1, 'alias': 'MXNJPY', 'epic': 'CS.D.MXNJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.4,'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
  //{"id":2, "alias": "Spot Platinum", "epic": "CS.D.PLAT.TODAY.IP", "data": {}, "deal": {}, "tradedbefore" : false, "stopDistancePerc" : "0.85", "minimumStop" : {"value": 10, "type": "points"}  }
  //{"id":2, "alias": "Spot Gold", "epic": "CS.D.USCGC.TODAY.IP", "data": {}, "deal": {}, "tradedBefore" : false, "stopDistancePerc" : 0.4, 'limitDistancePerc' : 0.4, "minimumStop" : {"value": null, "type": "points"}, 'size': 1   },
  //{'id':3, 'alias': 'Chicago Wheat', 'epic': 'CC.D.W.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.4, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1   },
//  {'id':4, 'alias': 'INRJPY', 'epic': 'CS.D.INRJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 2, 'type': 'points'}  },
 // {'id':4, 'alias': 'London Gas Oil', 'epic': 'CC.D.LGO.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.4, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
//];

//October

//Main parameters
markets = [
   //{'id':0, 'alias':'stellar', 'epic' : 'CS.D.XLMUSD.TODAY.IP', 'data': {}, 'deal' : {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.08', 'minimumStop' : {'value': 0.01, 'type': 'percent'} },
   // {'id':1, 'alias': 'NEO', 'epic': 'CS.D.NEOUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false }
   //{'id':1, 'alias': 'Ripple', 'epic': 'CS.D.XRPUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 10, 'type': 'points'}  }
    // {'id':0, 'alias': 'Volatility Index', 'epic': 'CC.D.VIX.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
   {'id':0, 'alias': 'iShares Global Clean Energy', 'epic': 'KA.D.INRG.DAILY.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
   {'id':1, 'alias': 'MXNJPY', 'epic': 'CS.D.MXNJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2,'minimumStop' : {'value': null, 'type': 'points'}, 'size': 5  },
   //{"id":2, "alias": "Spot Platinum", "epic": "CS.D.PLAT.TODAY.IP", "data": {}, "deal": {}, "tradedbefore" : false, "stopDistancePerc" : "0.85", "minimumStop" : {"value": 10, "type": "points"}  }
   {"id":2, "alias": "Spot Gold", "epic": "CS.D.USCGC.TODAY.IP", "data": {}, "deal": {}, "tradedBefore" : false, "stopDistancePerc" : 0.4, 'limitDistancePerc' : 0.2, "minimumStop" : {"value": null, "type": "points"}, 'size': 1   },
   {'id':3, 'alias': 'Chicago Wheat', 'epic': 'CC.D.W.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1   },
   //  {'id':4, 'alias': 'INRJPY', 'epic': 'CS.D.INRJPY.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 2, 'type': 'points'}  },
   {'id':4, 'alias': 'London Gas Oil', 'epic': 'CC.D.LGO.USS.IP', 'data': {}, 'deal': {}, 'tradedBefore' : false, 'stopDistancePerc' : 0.4, 'limitDistancePerc' : 0.2, 'minimumStop' : {'value': null, 'type': 'points'}, 'size': 1  },
 ];




market = {};
trades = [];
accounts = [];
monitors = [];
monitor = { 'epic': '', 'dealId': '', 'dealRef': '', 'streamLogDir' : '' , 'direction': '' }
trade = { 'marketId' : 0, 'epic':'', 'direction': '', 'dealId': '', 'dealRef': '', 'startAnalysis': '', 'closeAnalysis': '', 'start_timestamp': '', 'start_date':'', 'end_timestamp': '', 'end_date': '', 'error': {} };
mid = 0;
epic = '';
dealIds = [];
dealId = '';
dealRef = '';
direction = '';
finalMessage = '';

rangeData = {'resistance': {}, 'support': {}, 'bumps': [], 'waves': [], 'wavecount': 0};
lineData = {'support': 0, 'resistance': 0, 'midrange': 0};
confirmationData = { 'waves':[], 'confirmationPoints': [], 'trendPoints' : [] };
confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

//Data files
pricedataDir = 'core/data/';
price4HourdataDir = 'core/data/';
analysisDataDir = 'core/data/';
plotDataDir = 'core/data/';
plot4HourDataDir = 'core/data/';
beforeRangeDir = 'core/data/';
marketDataDir = 'core/data/marketdata.json';
accountDataDir = 'core/data/accountdata.json';
tradeDataDir = 'core/data/';
streamLogDir = 'core/data/';
errorDataDir = 'core/data/';
monitorDataDir = 'core/data/monitordata.json';


//Price data variables
prices = [];
prices_4hour = [];
pricedata = {'support': [], 'resistance': []};
pricedata2 = {'support': [], 'resistance': []};
pricedata3 = {'support': [], 'resistance': []};
supportline = 0;
resistanceline = 0;
trend = 'ranging';
trend4Hours = 'ranging';
trendDiff = 0;
trendDiffPerc = 0;
trend4HoursDiff = 0;
trend4HoursDiffPerc = 0;
firstClose = 0;
firstDiff = 0;
first4HoursClose = 0;
last4HoursClose = 0;
lastOpen = 0;
lastClose = 0;
lastHigh = 0;
lastLow = 0;
lastTime = 0;
lastCloseAsk = 0;
lastCloseBid = 0;
lastDiff = 0;
beforeRangeData = {};
beforeRangeSha = '';
pricesSha = '';
marketDataSha = '';
tradeDataSha = '';
accountDataSha = '';
monitorDataSha = '';
// shas = [];
// sha = 0;
beforeRangeFirstClose = 0;
beforeRangeTrend = 'ranging';
beforeRangeFirstCloseData = {};
beforeRangeTrendDiff = 0;
beforeRangeTrendDiffPerc = 0;
beforeRangeOveridden = false;
isBeforeRangeTrendNotBroken = false;
recenttrendArr = [];
recenttrend = '';
recentrange = [];
ups = 0;
downs = 0;
movementValue= 0;
movementValueDiff = 0;
movementValueDiffPerc = 0;
isRecentTrendBreaking = false;
currenttrend = '';
pricedatacount = 0;
previousTrend = 'ranging';
bRD = {};
bumpgroupcount = 0;
lineDistance = 0;
rangeConfirmations = 0;
is4HoursTrendOveride = false;
resolutionPointsLimit_4Hours = 60;
resolutionPointsLimit_1Hour = 72;

//Analysis data
analysisDataSet = [];
plotDataSet = [];
plot4HourDataSet = [];
analysis = {};
closes = [];
times = [];
rangeAnalysis = [];
volatilityGapAnalysis = [];
highs = [];
lows = [];
opens = [];
lowestPrice = 0;
highestPrice = 0;
priceDiff = 0;
highs4 = [];
lows4 = [];
close4 = [];
open4 = [];
range4 = [];
times4 = [];
lowest4HourPrice = 0;
highest4HourPrice = 0;
priceDiff4Hours = 0;
falseChecks = [];
trueChecks = [];
isDeal = true;

//Dates
resolution = 'HOUR';
timestamp = 0;
today = '';
fulldate = '';
date1 = '';
date2 = '';
date_1week = '';
currenthour = 0;
lasthour = 0;
last4hours = 0;
// from = '';
// to = '';
// from2 = '';
// to2 = '';
// from_4hours = '';
// to_4hours = '';

from_1week = '';
from_3days = '';
from_4hours =  '';
from_1hour = '';
to = '';

//Other variables
totalMissingHours = 0;
isHoursCorrect = true;
isNoVolatileGap = true;
noError = true;
isLoopRunning = false;
isStreamRunning = {};
tradebeforeCheck = false;
isWaveOveride = false;

//accounts
availableLoss = 0;
