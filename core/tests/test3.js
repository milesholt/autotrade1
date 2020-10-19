

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
  //NEO - UC.D.NEOSUS.JUN.IP
  //Stellar - CS.D.XLMUSD.TODAY.IP
  //Ripple - CS.D.XRPUSD.TODAY.IP
  console.log('-------Searching for Epics');
  await api.search('Ripple').then(r => {
    console.log(r);
  }).catch(e => console.log(e));

  //Confirm position
  // let dealRef = 'DIAAAAEDV2WPGAQ';
  // await api.confirmPosition(dealRef).then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Get history
  // let from = undefined;
  // let to = undefined;
  // let detailed = undefined;
  // let dealId = 'DIAAAAEDV2WPGAQ';
  // let pageSize = 50;
  // await api.acctActivity(from, to, detailed, dealId, pageSize).then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));


  //time check6let timestamp  = moment().format('LLL');
  // let timestamp  = moment().format('LLL');
  // console.log('Beginning exec. Should be 10 seconds after hour. Time is:' + timestamp);


}
