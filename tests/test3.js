// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

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
  // await api.login(true).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  //Switch Default Account (Spread - Z32EDV, CFD - Z32EDW)
  // console.log('-------Switching accounts');
  // await api.switchDefaultAcct('Z32EDV').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check account
  // console.log('-------Checking account');
  // await api.acctInfo().then(r => {
  //   //console.log(r);
  // }).catch(e => console.log(e));

  //Search contract
  //CS.D.BITCOIN.TODAY.IP
  // console.log('-------Searching for Epics');
  // await api.search('Bitcoin').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));


  //time check6let timestamp  = moment().format('LLL');
  let timestamp  = moment().format('LLL');
  console.log('Beginning exec. Should be 10 seconds after hour. Time is:' + timestamp);


}
