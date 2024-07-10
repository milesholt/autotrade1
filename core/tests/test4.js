

const api=require('node-ig-api');
const util=require('util');
const moment=require('moment');
moment().format();

let prices;
let pricedata = {'support': [], 'resistance': []};
let confirmations = {'resistance': 0, 'support': 0};
let confirmationlimit = 4;

exec();

//Execute async script
async function exec(){

  console.log('--------BEGIN EXEC AUTO TRADE');

  //Logout --clears tokens
  // console.log('-------Logging out');
  // await api.logout(true).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  //Login
  // console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Switch Default Account (Accountid -  102399016 Spread - Z3MUI3, CFD - Z3MUI2)
  // console.log('-------Switching accounts');
  // await api.switchDefaultAcct('Z32EDV').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check account
  // console.log('-------Checking account');
  // await api.acctInfo().then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Search contract
  //Bitcoin - CS.D.BITCOIN.TODAY.IP
  //NEO - 'CS.D.NEOUSD.TODAY.IP
  //Stellar - CS.D.XLMUSD.TODAY.IP
  //Ripple - CS.D.XRPUSD.TODAY.IP

 const epic = 'CS.D.NEOUSD.TODAY.IP';
 const size = 50;
 const limitDistance = 0.34;
 const stopDistance =  0.76;

 let ticket = {
    'currencyCode': 'GBP',
    'direction': 'BUY',
    'epic': epic,
    'expiry': 'DFB',
    'size': size,
    'forceOpen': true,
    'orderType': 'MARKET',
    'level': null,
    'limitDistance': limitDistance,
    'limitLevel': null,
    'stopDistance': stopDistance,
    'stopLevel': null,
    'guaranteedStop': false,
    'timeInForce': 'FILL_OR_KILL',
    'trailingStop': null,
    'trailingStopIncrement': null
  };

  await api.deal(ticket).then(async r => {
    console.log(util.inspect(r, false, null));
  }).catch(e => {
    console.log(util.inspect(e, false, null));
  });


}
