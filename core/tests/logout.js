

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

  console.log('--------LOGGIN OUT AND CLEARING TOKENS');

  //Logout --clears tokens
  console.log('-------Logging out');
  await api.logout(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

}
