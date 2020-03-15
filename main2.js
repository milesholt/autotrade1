// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');

moment().format();

//Require strategy
const strategy = require('./strategies/breakoutStrategy.js');
//Require analytics
const analytics = require('./services/analytics.js');
//Require mailer
const mailer = require('./services/mailer.js');

//Parameters
let check1 = false, check2 = false, check3 = false, check4 = false;
let prices = [];
let pricedata = {'support': [], 'resistance': []};
global.confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;
const epic = 'CS.D.BITCOIN.TODAY.IP';
const resolution = 'HOUR';
const date1 = moment().add(1, 'days').format('YYYY-MM-DD');
const date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');


//Execute main function
exec();

//Begin Exec function
async function exec(){

  console.log('--------BEGIN EXEC AUTO TRADE');

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    //console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Retrieve data from epic
  console.log('-------Retrieving historic pricing data for epic');
  const from = date2+'%20'+'00:00:00';
  const to = date1+'%20'+'00:00:00';
  await api.histPrc(epic, resolution, from, to).then(r => {
    console.log(prices);
    prices = r.prices;
  }).catch(e => {
    console.log(e);
  });

}
