

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
  //Volatility Index - CC.D.VIX.USS.IP
  //Chicago  Wheat - CC.D.W.USS.IP
  //Spot platinum - CS.D.PLAT.TODAY.IP


  // console.log('-------Searching for Epics');
  // const searchterm = encodeURI('MXN JPY');
  // await api.search(searchterm).then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Confirm position
  // let dealRef = 'Y9K5N33WEGY44S4';
  // await api.confirmPosition(dealRef).then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Get history
  // let from = undefined;
  // let to = undefined;
  // let detailed = true;
  // let dealId = 'DIAAAAE3E8KCJAQ';
  // let pageSize = 50;
  // await api.acctActivity(from, to, detailed, dealId, pageSize).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));



  let dealId = 'DIAAAAE3E8KCJAQ';
  let pageSize = 50;
  let type = 'ALL_DEAL';
  let from = undefined;
  let to = undefined;

  await api.acctTransaction(type,from, to, pageSize,1).then(r => {
    console.log(util.inspect(r,false,null));
    let transactions = r.transactions;
    transactions.forEach(transaction =>{
      if(transaction.reference == dealId){
        console.log('dealId found. position has been closed');
        let dateClosed = transaction.dateUtc;
        let profitLoss = transaction.profitAndLoss.split('£')[1];
        let closeLevel = transaction.closeLevel;
        console.log('dateClosed: ' + dateClosed);
        console.log('profitLoss: ' + profitLoss);
        console.log('closeLevel: ' + closeLevel);

      }
    });
  }).catch(e => console.log(e));


  //Get prices
  // const resolution = 'HOUR';
  // const from = '2021-01-06%2000:00:00';
  // const to = '2021-01-09%2009:00:00';
  // await api.histPrc('CC.D.VIX.USS.IP', resolution, from, to).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));


  //time check6let timestamp  = moment().format('LLL');
  // let timestamp  = moment().format('LLL');
  // console.log('Beginning exec. Should be 10 seconds after hour. Time is:' + timestamp);


}
