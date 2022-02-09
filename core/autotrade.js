/*

Main requirements

*/

const config = require('./config.js');
const { range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');
var actions = {};

/*

Core services

*/

const breakoutStrategy = require('./strategies/breakoutStrategy.js');
const confirmationStrategy = require('./strategies/confirmationStrategy.js');
const analytics = require('./services/analytics.js');
const mailer = require('./services/mailer.js');
const testmailer = require('./tests/mailer.js');
const stream = require('./services/stream.js');
const monitor = require('./services/monitor.js');
const library = require('./services/library.js');
const log = require('./services/log.js');

/*

Core handlers

*/


//Strategy handlers
//Todo - for each strategy to have its own module that includes child modules to core

/* Breakout strategy */

const checkHandler = require('./handlers/strategies/breakOut/checkHandler.js');
const beforeRangeHandler = require('./handlers/strategies/breakOut/beforeRangeHandler.js');
const recentTrendHandler = require('./handlers/strategies/breakOut/recentTrendHandler.js');
const missingHoursHandler = require('./handlers/strategies/breakOut/missingHoursHandler.js');
const bumpsHandler = require('./handlers/strategies/breakOut/bumpsHandler.js');
const analysisHandler = require('./handlers/strategies/breakOut/analysisHandler.js');

//Generic handlers

const cloudHandler = require('./handlers/cloudHandler.js');
const loopHandler = require('./handlers/loopHandler.js');
const notificationHandler = require('./handlers/notificationHandler.js');
const errorHandler = require('./handlers/errorHandler.js');
const trendHandler = require('./handlers/trendHandler.js');
const priceDataHandler = require('./handlers/priceDataHandler.js');
const tradeHandler = require('./handlers/tradeHandler.js');


/*

SET PATHS
Set main paths for storing data

*/

actions.setPaths = async function(){
  pricedataDir = 'core/data/'+epic+'/'+epic+'_pricedata.json';
  price4HourdataDir = 'core/data/'+epic+'/'+epic+'_pricedata_4hour.json';
  beforeRangeDir = 'core/data/'+epic+'/'+epic+'_beforerangedata.json';
  tradeDataDir = 'core/data/'+epic+'/'+epic+'_tradedata.json';
  streamLogDir = 'core/data/'+epic+'/'+epic+'_streamdata.json';
  errorDataDir = 'core/data/'+epic+'/'+epic+'_errordata.json';
  analysisDataDir = 'core/data/'+epic+'/'+epic+'_analysisdata.js';
  plotDataDir = 'core/data/'+epic+'/'+epic+'_plotdata.js';
  plot4HourDataDir = 'core/data/'+epic+'/'+epic+'_plotdata_4hour.js';
}


/*

SET DEFAULTS
This resets any default variables for each loop

*/

actions.setDefaults = async function(){
  //Main variables
  check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true; check13 = false; check14 = false; check15 = false;

  // checks = {
  //   '___4HoursNotRanging': {'is':false}, //check14
  //   '___noBumpInRange': {'is':true}, //check11
  //   '___noVolatileGap': {'is':false}, //check10
  //   '___breakingThroughRange': {'is':false}, //check8
  //   '___withinTradeThreshold': {'is':true}, //check9
  //   '___beforeRangeTrendNotBroken': {'is':false}, //check13
  //   '___recentTrendSameAsTrend': {'is':false}, //check6
  //   '___beforeRangeSameAsTrend': {'is':false}, //check7
  //   '___rangeConfirmationsGreaterThanLimit': {'is':false}, //check2
  //   '___rangeAreaGood': {'is':false}, //check0
  //   '___enoughWaves': {'is':false}, //check15
  //   '___notTradedBefore': {'is':false}, //check12
  //   '___enoughConfirmations': {'is':false},
  //   '___recentTrendPivoting':{'is':true},
  //   '___lastCloseAboveBelowLines':{'is':false},
  //   '___beforeRangeSameAs4HourTrend':{'is':false},
  //   '___recentTrendSameAs4HourTrend':{'is':false},
  //   '___noBumpVolatility':{'is':true},
  //   '___nolastPriceVolatile':{'is':true}
  // }

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

  rangeData = {'resistance': {}, 'support': {}, 'bumps': [], 'waves': [], 'wavecount': 0};
  lineData = {'support': 0, 'resistance': 0, 'midrange': 0};
  confirmationData = { 'waves':[], 'confirmationPoints': {}, 'trendPoints' : {} };
  confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

  //Date variables
  resolution = 'HOUR';
  timestamp  = moment.utc().format('LLL');
  today = moment.utc().format('YYYY-MM-DD');
  fulldate = moment.utc().format('LLL');
  date1 = moment.utc().add(1, 'days').format('YYYY-MM-DD');
  date2 = moment.utc().subtract(3, 'days').format('YYYY-MM-DD');
  date_1week = moment.utc().subtract(7, 'days').format('YYYY-MM-DD');

  currenthour = moment.utc().format("HH");
  lasthour = moment.utc().subtract(1, 'hours').format("HH");
  last4hours = moment.utc().subtract(4, 'hours').format("HH");

  //3 day date range
  //from = date2+'%20'+'00:00:00';
  //to = today+'%20'+currenthour+':00:00';
  //last hour date range
  //from2 = today+'%20'+lasthour+':00:00';
  //to2 = today+'%20'+currenthour+':00:00';

  from_1week = moment.utc().subtract(7, 'days').format('YYYY-MM-DD%2000:00:00');
  from_3days = moment.utc().subtract(3, 'days').format('YYYY-MM-DD%2000:00:00');
  from_4hours =  moment.utc().subtract(4, 'hours').format('YYYY-MM-DD%20HH:00:00');
  from_1hour = moment.utc().subtract(1, 'hours').format('YYYY-MM-DD%20HH:00:00');
  to = moment.utc().format('YYYY-MM-DD%20HH:00:00');



  //Price variables
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
  trend4HoursDiff = 0;
  trend4HoursDiffPerc = 0;
  rendDiffPerc = 0;
  firstClose = 0;
  firstDiff = 0;
  lastOpen = 0;
  lastClose = 0;
  lastHigh = 0;
  lastLow = 0;
  lastTime = 0;
  lastCloseAsk = 0;
  lastCloseBid = 0;
  lastDiff = 0;
  first4HoursClose = 0;
  last4HoursClose = 0;
  rangeAreaLimit=0;
  beforeRangeData = {};
  beforeRangeSha = '';
  pricesSha = '';
  marketDataSha = '';
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
  dealId = '';
  pricedatacount = 0;
  previousTrend = 'ranging';
  bRD = {};
  bumpgroupcount = 0;
  bumpVolatilityDiff = 0;
  bumpVolatilityPerc = 0;
  bumpVolatilityIndex = 0;
  lineDistance = 0;
  rangeConfirmations = 0;
  stopDistance = 0;
  stopDistanceLevel = 0;
  limitDistance = 0;
  limitDistanceLevel = 0;
  is4HoursTrendOveride = false;

  //Analysis data
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


  //Other variables
  isHoursCorrect = true;
  isNoVolatileGap = true;
  totalMissingHours = 0;
  noError = true;
  finalMessage = '';
  analysis = {};
  isWaveOveride = false;
  isMidTrendOveride = false;
}

/*

BEGIN
This function logs into the API, then executes first loop of handlers

*/

actions.begin = async function(){
  //Login and check for open positions first
  await actions.init();
  //Then execute main function, looping initially
  await loopHandler.actions.loop();
}

/*

INIT
Initiates first processes before looping
Logging into the API
Then checks for any open positions and begins monitoring if any

*/

actions.init = async function(){
  //Login
  await api.login(true).then(r => {
  }).catch(e => console.log(e));

  //Get hosted data files
  await cloudHandler.actions.getMainFiles();

  //Check for any trades
  await checkHandler.actions.checkOpenTrades();

}

/*

EXEC
This is the main function that executes all the handlers in the loop

*/

actions.exec = async function(){

  //Reset default variables
  await actions.setDefaults();

  //Set paths
  await actions.setPaths();

  //Get hosted data files
  await cloudHandler.actions.getFiles();

  //Check for an open trade on this market
  await checkHandler.actions.checkOpenTrade();

  //Handle price data
  await priceDataHandler.actions.getPriceData();

  //Handle price data (4 hour)
  await priceDataHandler.actions.getPriceData('HOUR_4');

  //Only continue exec if no error getting price data
  if(noError){

    //Get availableLoss
    await checkHandler.actions.checkMarginAvailability();

    //Sort price data
    await priceDataHandler.actions.sortPriceData();

    //Sort dynamic limits
    await checkHandler.actions.configLimits();

    //Setup lines
    supportline = await breakoutStrategy.actions.calcResistSupport(pricedata2,'support');
    resistanceline = await breakoutStrategy.actions.calcResistSupport(pricedata2,'resistance');
    lineData.support = supportline;
    lineData.resistance = resistanceline;

    //Check lines
    await checkHandler.actions.checkLines();

    //Check range confirmations
    await checkHandler.actions.checkRangeConfirmations();

    //Set price data variables
    await priceDataHandler.actions.setPriceData();

    //Handle trend
    await trendHandler.actions.determineTrend();

    //Handle 4 hour trend
    await trendHandler.actions.determine4HourTrend();

    //Handle mid 4 hour trend
    await trendHandler.actions.determineMid4HourTrend();

    //Handle confirmations
    await confirmationStrategy.actions.determineConfirmations();

    //Handle beforeRangeData
    await beforeRangeHandler.actions.determineBeforeRangeData();

    //Determine beforeRange trend strength
    await beforeRangeHandler.actions.determineBeforeRangeTrend();

    //Handle recent trend
    await recentTrendHandler.actions.determineRecentTrend();

    //Handle recent range
    await recentTrendHandler.actions.determineRecentRange();

    //Handle missing hours
    await missingHoursHandler.actions.determineMissingHours();

    //Handle Volatility gap
    await missingHoursHandler.actions.determineVolatilityGap();

    //Handle bumps
    await bumpsHandler.actions.determineBumps();
    await bumpsHandler.actions.determineBumpVolatility();

    //Final checks
    await checkHandler.actions.finalChecks();

    //Determine stop and limit distances
    await analysisHandler.actions.determineStopDistance();
    await analysisHandler.actions.determineLimitDistance();

    //Final analysis
    await analysisHandler.actions.finalAnalysis();

    //Do any checks for existing trades
    await tradeHandler.actions.determineNearProfit();

    //Determine trade
    await tradeHandler.actions.determineTrade();

    //Final logs
    console.log('--------UPDATING MARKET----------');
    //console.log(util.inspect(market, false, null));
    //console.log(market);
    markets[mid] = market;
    await cloudHandler.actions.updateFile(markets,marketDataDir);

    //Do any fixes for next run
    await actions.fixes();

  }


  //Finish and loop again

  isLoopRunning = false;
  loopHandler.actions.loop(finalMessage);
  return false;


}

actions.fixes = async function(){

  //If missing hours, empty price data to re-download for next run
  //if(!isHoursCorrect && totalMissingHours > 60) await cloudHandler.actions.updateFile([],pricedataDir);


}


//Core export

module.exports = {
  actions:actions,
  moment:moment,
  api:api,
  path:path,
  fs:fs,
  util:util,
  strategy:breakoutStrategy,
  analytics:analytics,
  mailer:mailer,
  testmailer:testmailer,
  stream:stream,
  monitor:monitor,
  lib:library,
  log:log,
  cloudHandler:cloudHandler,
  loopHandler:loopHandler,
  notificationHandler:notificationHandler,
  analysisHandler:analysisHandler,
  errorHandler:errorHandler,

}


//After export, call child module requirements

analysisHandler.actions.require();
beforeRangeHandler.actions.require();
bumpsHandler.actions.require();
checkHandler.actions.require();
missingHoursHandler.actions.require();
recentTrendHandler.actions.require();

tradeHandler.actions.require();
priceDataHandler.actions.require();
trendHandler.actions.require();
cloudHandler.actions.require();
loopHandler.actions.require();
notificationHandler.actions.require();
errorHandler.actions.require();

log.actions.require();
analytics.actions.require();



/*

Begin core process

*/

actions.begin();
