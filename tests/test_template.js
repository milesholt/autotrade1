
//Requirements
const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
const fs = require('fs');
// const https = require('https');
const path = require('path');
moment().format();

//Require strategy
const strategy = require('./strategies/breakoutStrategy.js');
//Require analytics
const analytics = require('./services/analytics.js');
//Require mailer
const mailer = require('./services/mailer.js');

//Parameters
let check1 = false, check2 = false, check3 = false, check4 = false;
let prices;
let pricedata = {'support': [], 'resistance': []};
global.confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;
const epic = 'CS.D.BITCOIN.TODAY.IP';
const resolution = 'HOUR';
let date1 = moment().add(1, 'days').format('YYYY-MM-DD');
let date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
let currenthour = moment().format("HH");
let lasthour = moment().subtract(1, 'hours').format("HH");
var pricedataDir = path.join(__dirname, 'pricedata.json');


//Execute main function
exec();

//Begin Exec function
async function exec(){

  let pricedata = {'support': [], 'resistance': []};
  confirmations = {'resistance': 0, 'support': 0};
  check1 = false, check2 = false, check3 = false, check4 = false;
  date1 = moment().add(1, 'days').format('YYYY-MM-DD');
  date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DD');
  today = moment().format('YYYY-MM-DD');
  currenthour = moment().format("HH");
  lasthour = moment().subtract(1, 'hours').format("HH");

  //3 day date range
  let from = date2+'%20'+'00:00:00';
  let to = date1+'%20'+'00:00:00';

  //last hour date range
  let from2 = today+'%20'+lasthour+':30:00';
  let to2 = today+'%20'+currenthour+':00:00';


  console.log('--------BEGIN EXEC AUTO TRADE');

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Retrieve data from epic
  console.log('-------Retrieving historic pricing data for epic');

  console.log(from2);
  console.log(to2);

  //if data from file is empty, load last 3 days
  await api.histPrc(epic, resolution, from2, to2).then(r => {
    console.log(r);
  }).catch(e => {
    //console.log(e);
    loop('Price data not empty. Error retrieving prices latest hour. Possible allowance reached. Waiting an hour.');
    return false;
  });


}
