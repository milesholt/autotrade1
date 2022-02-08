

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

  date0 = moment().format('YYYY-MM-DDTHH:mm:ssZ');
  date1 = moment().add(1, 'days').format('YYYY-MM-DDTHH:mm:ssZ');
  date2 = moment(date1).subtract(3, 'days').format('YYYY-MM-DDTHH:mm:ssZ');


  console.log(date0);

  console.log('--------BEGIN EXEC AUTO TRADE');

  //Logout --clears tokens
  // console.log('-------Logging out');
  // await api.logout(true).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  //Login
  // console.log('-------Logging in');
  await api.login(true).then(r => {
    //console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Switch Default Account (Accountid -  102399016 Spread - Z3MUI3, CFD - Z3MUI2)
  // console.log('-------Switching accounts');
  // await api.switchDefaultAcct('Z32EDV').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check account
  // console.log('-------Checking account');
  await api.acctInfo().then(r => {
    //console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //App info (requests etc)
  // await api.apiInfo().then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));


  //Search contract
  //Bitcoin - CS.D.BITCOIN.TODAY.IP
  //NEO - 'CS.D.NEOUSD.TODAY.IP
  //Stellar - CS.D.XLMUSD.TODAY.IP
  //Ripple - CS.D.XRPUSD.TODAY.IP
  //Volatility Index - CC.D.VIX.USS.IP
  //Chicago  Wheat - CC.D.W.USS.IP
  //Spot platinum - CS.D.PLAT.TODAY.IP
  //london Gas Oil - CC.D.LGO.USS.IP
  //Spot Gold - CS.D.USCGC.TODAY.IP'
  //Rolls-Royce Holdings PLC - KA.D.RR.DAILY.IP
  //INR/JPY - CS.D.INRJPY.TODAY.IP
  //MXN/JPY - CS.D.MXNJPY.TODAY.IP
  //Clean Energy - KA.D.INRG.DAILY.IP'
  //Carbon Emissions - CO.D.CFI.Month1.IP
  //NOK/JPY - CS.D.NOKJPY.TODAY.IP
  //Lloyds Bank PLC - KA.D.LLOY.DAILY.IP
  //Alto Ingredients - UC.D.PEIXUS.DAILY.IP


  // console.log('-------Searching for Epics');
 const searchterm = encodeURI('Alto Ingredients');
  await api.search(searchterm).then(r => {
    console.log(r);
  }).catch(e => console.log(e));

  //Confirm position
  // let dealRef = '2XMFTXH4WH644TP';
  // await api.confirmPosition(String(dealRef)).then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Get current open position
  // let dealId = 'DIAAAAFHBECTTBB';
  // await api.getPosition(String(dealId)).then(async r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Show open positions
  // await api.showOpenPositions().then(r => {
  // console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  //Get markets
  // let epics = ['CS.D.BITCOIN.TODAY.IP'];
  // await api.epicDetails(epics).then(r => {
  //   console.log(util.inspect(r,false,null));
  //   //console.log(r.marketDetails[0].dealingRules.minNormalStopOrLimitDistance);
  //   //console.log(r.marketDetails[0].snapshot.marketStatus);
  //   //
  // }).catch(e => console.log(e));

   //Get history
  //  let from2 = undefined;
  //  let to2 = undefined;
  //  let detailed = true;
  //  //let dealId = 'DIAAAAFFBKE4KAK';
  //  //let dealId = 'DIAAAAGSNHQ7PAR';
  //  let dealRef2 = 'BCCK8DMRV5WT28R';
  //  let dealId = 'DIAAAAGSCLX37AV';
  //  let dealId2;
  //  let pageSize2 = 50;
  //  await api.acctActivity(from2, to2, detailed, undefined, pageSize2).then(r => {
  //   //console.log(util.inspect(r,false,null));
  //   if(r.activities.length){
  //     // r.activities.forEach(activity => {
  //     //   if(activity.dealId == dealRef ){
  //     //     console.log(activity);
  //     //   }
  //     // });
  //     r.activities.forEach(activity => {
  //
  //         //console.log(activity);
  //         //console.log(util.inspect(activity,false,null));
  //
  //         if(activity.details.actions.length){
  //           if(activity.details.actions[0].affectedDealId == dealId && activity.details.actions[0].actionType == 'POSITION_CLOSED'){
  //             console.log('Position has been found and has been closed');
  //             dealId2 = activity.dealId;
  //             console.log('Updated dealId: ' + activity.dealId);
  //           }
  //         }
  //
  //       // if(activity.details.dealReference == dealRef ){
  //       //   console.log(activity.details);
  //       //   console.log(activity.details.actions[0].actionType);
  //       // }
  //     });
  //   }
  // }).catch(e => console.log(e));


  // {
  //    date: '2021-04-01',
  //    dateUtc: '2021-04-01T14:41:33',
  //    openDateUtc: '2021-04-01T14:03:03',
  //    instrumentName: 'London Gas Oil',
  //    period: 'DFB',
  //    profitAndLoss: '£6.80',
  //    transactionType: 'DEAL',
  //    reference: 'DIAAAAFFB23W5AG',
  //    openLevel: '505.6',
  //    closeLevel: '498.8',
  //    size: '-1',
  //    currency: '£',
  //    cashTransaction: false
  //  },




//let dealId = 'DIAAAAGSNHQ7PAR';
// let pageSize = 20;
// let type = 'ALL_DEAL';
// let from = undefined;
// let to = undefined;
//   // //
//   await api.acctTransaction(type,from, to, pageSize,1).then(r => {
//     //console.log(util.inspect(r,false,null));
//     let transactions = r.transactions;
//     transactions.forEach(transaction =>{
//       if(transaction.reference == dealId2){
//         console.log(dealId2);
//         console.log('dealId found. position has been closed');
//         let dateClosed = transaction.dateUtc;
//         let profitLoss = transaction.profitAndLoss.split('£')[1];
//         let closeLevel = transaction.closeLevel;
//         //console.log('dateClosed: ' + dateClosed);
//         //console.log('profitLoss: ' + profitLoss);
//         console.log(typeof profitLoss);
//         console.log(Number(profitLoss).toFixed(2));
//         //console.log('closeLevel: ' + closeLevel);
//
//       }
//     });
//   }).catch(e => console.log(e));


  //Get prices
  // const resolution = 'HOUR';
  // const from = '2021-01-06%2000:00:00';
  // const to = '2021-01-09%2009:00:00';
  // await api.histPrc('CS.D.USCGC.TODAY.IP', resolution, from, to).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  // const resolution = 'HOUR_4';
  // const from = moment().subtract(8, 'hours').format('YYYY-MM-DD%20HH:00:00');;
  // const to = moment().format('YYYY-MM-DD%20HH:00:00');
  // await api.histPrc('CC.D.VIX.USS.IP', resolution, from, to).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));


  //time check6let timestamp  = moment().format('LLL');
  // let timestamp  = moment().format('LLL');
  // console.log('Beginning exec. Should be 10 seconds after hour. Time is:' + timestamp);


}
