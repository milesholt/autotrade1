//Checks
check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true;

//Main limits
rangelimit = 0.25;
tradelimit = 0.4;
recentlimit = 4;
recentrangelimit =  5;
linedistancelimit =  0.05;
rangeConfirmationLimit = 12;
stopDistanceFluctuation = 0.1;
confirmationlimit = 3;
missingHoursLimit = 3;
bumpgrouplimit = 5;

//Main parameters
epic = 'CS.D.XLMUSD.TODAY.IP';
rangeData = {'resistance': {}, 'support': {}, 'bumps': []};
lineData = {'support': 0, 'resistance': 0, 'midrange': 0};
confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

//Data files
pricedataDir = 'core/data/pricedata.json';
beforeRangeDir = 'core/data/beforerangedata.json';

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
beforeRangeSh = '';
pricesSha = '';
beforeRangeFirstClose = 0;
beforeRangeTrend = 'ranging';
beforeRangeFirstCloseData = {};
beforeRangeTrendDiff = 0;
beforeRangeOveridden = false;
lastBeforeRangeTrendMovementDiff = 0;
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
dealId = '';
pricedatacount = 0;
previousTrend = 'ranging';
bRD = {};

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
tradedbefore = false;
noError = true;
isHoursCorrect = true;
