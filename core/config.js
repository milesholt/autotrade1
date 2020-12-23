//Checks
check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true;

//Main limits
momentLimitPerc = 0.1;
rangeLimitPerc = 0.45;
tradeLimitPerc = 0.3;
lineDistanceLimitPerc = 0.05;
limitDistancePerc = 0.06;

momentumLimit = 0;
rangelimit = 0;
tradelimit = 0;
linedistancelimit =  0;

//Specific Strategy Limits
breakoutMaxMargin = 0.4;

stopDistanceFluctuationPerc = 0.1;
recentlimit = 4;
recentrangelimit =  5;
rangeConfirmationLimit = 12;
confirmationlimit = 3;
missingHoursLimit = 3;
bumpgrouplimit = 5;
size = 50;


//Main parameters
markets = [
  {'id':0, 'alias':'stellar', 'epic' : 'CS.D.XLMUSD.TODAY.IP', 'data': {}, 'deal' : {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.08', 'minimumStop' : {'value': 0.01, 'type': 'percent'} },
  // {'id':1, 'alias': 'NEO', 'epic': 'CS.D.NEOUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false }
  {'id':1, 'alias': 'Ripple', 'epic': 'CS.D.XRPUSD.TODAY.IP', 'data': {}, 'deal': {}, 'tradedbefore' : false, 'stopDistancePerc' : '0.85', 'minimumStop' : {'value': 10, 'type': 'points'}  }
];
market = {};
trades = [];
accounts = [];
monitors = [];
monitor = { 'epic': '', 'dealId': '', 'dealRef': '', 'streamLogDir' : '' }
trade = { 'marketId' : 0, 'epic':'', 'dealId': '', 'dealRef': '', 'startAnalysis': '', 'closeAnalysis': '', 'start_timestamp': '', 'start_date':'', 'end_timestamp': '', 'end_date': '', 'error': {} };
mid = 0;
epic = '';
dealIds = [];
dealId = '';
dealRef = '';
direction = '';
finalMessage = '';

rangeData = {'resistance': {}, 'support': {}, 'bumps': []};
lineData = {'support': 0, 'resistance': 0, 'midrange': 0};
confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

//Data files
pricedataDir = 'core/data/';
beforeRangeDir = 'core/data/';
marketDataDir = 'core/data/marketdata.json';
accountDataDir = 'core/data/accountdata.json';
tradeDataDir = 'core/data/';
streamLogDir = 'core/data/';
errorDataDir = 'core/data/';
monitorDataDir = 'core/data/monitordata.json';


//Price data variables
prices = [];
pricedata = {'support': [], 'resistance': []};
pricedata2 = {'support': [], 'resistance': []};
pricedata3 = {'support': [], 'resistance': []};
supportline = 0;
resistanceline = 0;
trend = 'ranging';
trendDiff = 0;
rendDiffPerc = 0;
firstClose = 0;
firstDiff = 0;
lastOpen = 0;
lastClose = 0;
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
beforeRangeOveridden = false;
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

//Analysis data
analysis = {};
closes = [];
times = [];
rangeAnalysis = [];
highs = [];
lows = [];
opens = [];
lowestPrice = 0;
highestPrice = 0;
priceDiff = 0;

//Dates
resolution = 'HOUR';
timestamp = 0;
today = '';
fulldate = '';
date1 = '';
date2 = '';
currenthour = 0;
lasthour = 0;
from = '';
to = '';
from2 = '';
to2 = '';


//Other variables
totalMissingHours = 0;
isHoursCorrect = true;
noError = true;
isLoopRunning = false;
