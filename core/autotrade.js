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

const strategy = require('./strategies/breakoutStrategy.js');
const analytics = require('./services/analytics.js');
const mailer = require('./services/mailer.js');
const testmailer = require('./tests/mailer.js');
const stream = require('./services/stream.js');
const monitor = require('./services/monitor.js');
const library = require('./services/library.js');

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

SET DEFAULTS
This resets any default variables for each loop

*/

actions.setDefaults = async function(){
  //Main variables
  check0 = false, check0_2 = false, check1 = false, check2 = false, check3 = false, check4 = false, check5 = false, check6 = false, check7 = false, check8 = false, check9 = true, check10 = true, check11 = true, check12 = true;
  rangeData = {'resistance': {}, 'support': {}, 'bumps': []};
  lineData = {'support': 0, 'resistance': 0, 'midrange': 0};
  confirmations = {'resistance': 0, 'support': 0, 'resistance_index': [], 'support_index':[]};

  //Date variables
  resolution = 'HOUR';
  timestamp  = moment().format('LLL');
  today = moment().format('YYYY-MM-DD');
  fulldate = moment().format('LLL');
  date1 = moment().add(1, 'days').format('YYYY-MM-DD');
  date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
  currenthour = moment().format("HH");
  lasthour = moment().subtract(1, 'hours').format("HH");
  //3 day date range
  from = date2+'%20'+'00:00:00';
  to = today+'%20'+currenthour+':00:00';
  //last hour date range
  from2 = today+'%20'+lasthour+':30:00';
  to2 = today+'%20'+currenthour+':00:00';

  //Data files
  pricedataDir = 'core/data/'+epic+'_pricedata.json';
  beforeRangeDir = 'core/data/'+epic+'_beforerangedata.json';

  //Price variables
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
  lineDistance = 0;
  rangeConfirmations = 0;


  //Other variables
  tradedbefore = false;
  noError = true;
  isHoursCorrect = true;
  totalMissingHours = 0;
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

  //Check for open positions
  await api.showOpenPositions().then(async positionsData => {
        console.log(util.inspect(positionsData, false, null));
        if(positionsData.positions.length > 0){
          monitor.actions.beginMonitor();
        }
  }).catch(e => console.log('catch error: showOpenPositions: ' + e));
}

/*

EXEC
This is the main function that executes all the handlers in the loop

*/

actions.exec = async function(){

  //Reset defaults
  await actions.setDefaults();

  //Get hosted data files
  await cloudHandler.actions.getFiles();

  //Handle price data
  await priceDataHandler.actions.getPriceData();

  //Sort price data
  if(noError) await priceDataHandler.actions.sortPriceData();

  //Setup lines
  supportline = await strategy.actions.calcResistSupport(pricedata2,'support');
  resistanceline = await strategy.actions.calcResistSupport(pricedata2,'resistance');
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

  //Handle beforeRangeData
  await beforeRangeHandler.actions.determineBeforeRangeData();

  //Handle recent trend
  await recentTrendHandler.actions.determineRecentTrend();

  //Handle recent range
  await recentTrendHandler.actions.determineRecentRange();

  //Handle missing hours
  await missingHoursHandler.actions.determineMissingHours();

  //Handle bumps
  await bumpsHandler.actions.determineBumps();

  //Final checks
  await checkHandler.actions.finalChecks();

  //Final analysis
  await analysisHandler.actions.finalAnalysis();

  //Determine trade
  await tradeHandler.actions.determineTrade();


}


//Core export

module.exports = {
  actions:actions,
  moment:moment,
  api:api,
  path:path,
  fs:fs,
  util:util,
  strategy:strategy,
  analytics:analytics,
  mailer:mailer,
  testmailer:testmailer,
  stream:stream,
  monitor:monitor,
  lib:library,
  cloudHandler:cloudHandler,
  loopHandler:loopHandler,
  notificationHandler:notificationHandler,
  errorHandler:errorHandler
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



/*

Begin core process

*/

actions.setDefaults();
actions.begin();
