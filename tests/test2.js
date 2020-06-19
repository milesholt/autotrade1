
const api=require('node-ig-api');
const util=require('util');

let prices;

exec();

//Execute async script
async function exec(){


  //Logout --clears tokens
  // console.log('-------Logging out');
  // await api.logout(true).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

  //Login
  console.log('-------Logging in');
  await api.login(true).then(r => {
    console.log(util.inspect(r,false,null));
  }).catch(e => console.log(e));

  //Switch Default Account (Spread - Z32EDV, CFD - Z32EDW)
  // console.log('-------Switching accounts');
  // await api.switchDefaultAcct('Z32EDV').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check account
  console.log('-------Checking account');
  await api.acctInfo().then(r => {
    console.log(r);
  }).catch(e => console.log(e));

  //Search contract
  //CS.D.BITCOIN.TODAY.IP
  // console.log('-------Searching for Epics');
  // await api.search('Bitcoin').then(r => {
  //   console.log(r);
  // }).catch(e => console.log(e));

  //Check pricing data
  //Resolution: DAY, HOUR, HOUR_2, HOUR_3, HOUR_4, MINUTE, MINUTE_10, MINUTE_15, MINUTE_2, MINUTE_3,MINUTE_30, MINUTE_5, MONTH, SECOND, WEEK
  console.log('-------Retreiving historic pricing data for Bitcoin');
  const epic = 'CS.D.BITCOIN.TODAY.IP';
  const resolution = 'HOUR_4';
  const from = '2019-12-01'+'%20'+'00:00:00';
  const to = '2019-12-20'+'%20'+'00:00:00';
  await api.histPrc(epic, resolution, from, to).then(r => {
    //console.log(util.inspect(r,false,null));
    prices = r.prices;
  }).catch(e => console.log(e));

  //Get Epic data
  // console.log('-------Retreiving information for Bitcoin');
  // const epics = ['CS.D.BITCOIN.TODAY.IP'];
  // await api.epicDetails(epics).then(r => {
  //   console.log(util.inspect(r,false,null));
  // }).catch(e => console.log(e));

console.log('-------- Prices:');
console.log(util.inspect(prices,false,null));

/* Work out Support Line based on average number of lowest prices */

//work out mid price (spreads between bid and ask/offer)
let supportdata = [];
let resistancedata = [];
let arr = [0,1,2];
console.log(typeof prices);
prices.forEach((price,idx) =>{
  //console.log(price);
  let midOpen = price.openPrice.ask - (parseInt(price.openPrice.ask - price.openPrice.bid)/2);
  let midClose = price.closePrice.ask - (parseInt(price.closePrice.ask - price.closePrice.bid)/2);
  let lowest = midOpen <= midClose ? midOpen : midClose;
  let highest = midOpen >= midClose ? midOpen : midClose;
  // console.log('--------' + idx);
  // console.log(price.openPrice.ask);
  // console.log(price.openPrice.bid);
  // console.log('midOpen:' + midOpen);
  // console.log('midClose:' + midClose);
  // console.log('lowest:' + lowest);
  supportdata.push({'price': lowest, 'open':midOpen, 'close': midClose, 'diff': Math.round(Math.abs(midOpen - midClose))});
  resistancedata.push({'price': highest, 'open':midOpen, 'close': midClose, 'diff': Math.round(Math.abs(midOpen - midClose))});
});

console.log('-------- Analyst Data:');
console.log(util.inspect(supportdata,false,null));


let supportline = 0;
let resistanceline = 0;

// supportline = await calc(supportdata,supportline);
// resistanceline = await calc(resistancedata,resistanceline);
//
//
// console.log('Support line for mid prices:' + supportline);
// console.log('Resistance line for mid prices:' + resistanceline);

await calcConfirmations(supportdata);

/* Resistance Line */





}//end of exec


/* Functions */

function sortNumber(a, b) {
  return a - b;
}

/* Calculates Resistance and Support Lines */

//TODO: Determine spread of matches, if it is below half the date range, this doesn't count as a line.

async function calc(newdata,line){
  let newdata2 = [];

  //sort newdata by order
  newdata.sort(sortNumber);

  let matches = [];

  //loop through min and max values of lowprices
  for(let i = newdata[0].price, len = newdata[newdata.length - 1].price; i <= len; i++){
    let match = false
    let m = [];
    //for each value, find the difference for each lowprice
    newdata.forEach(data => {

      let price = parseFloat(data.price);
      let diff = Math.abs(price - i);

      //if the difference is small (eg. 2 ), count as a potential match
      //the smaller the difference, the more accurate
      if(diff <= 2){
        match = true;
        //push each lowprice as part of that match
        m.push(data.price);
      }
    });
    //push number of matching lowprices with matched value
    if(match) matches.push({'integer': i,'prices': m});
  }

  let mostprices = 0;

  console.log(matches);

  //loop through matches
  matches.forEach(match =>{
    //if value has the greatest number of lowprices, this becomes the support line
    if(match.prices.length >= mostprices){
      line = match.integer;
      mostprices = match.prices.length;
    }
  });

  return line;
}

/* Calculates Confirmations */

async function calcConfirmations(data){
  //loop through Data
  //for every three sticks, we total the difference
  //if the difference is significant in comparing to the previous three sticks, we mark as potential
  //if the direction changes, we put the the next three sticks as potential close
  //if the difference between the following three sticks is significantly less than the difference of close
  //then we confirm as a Confirmation
  //if the direction is bear then bull, we push that into new data for support trend confirmation and vice versa


  //loop through data, and put every three prices into a group, along with difference in change
  let groupdata = [];
  let i = 0;
  let set = [];
  let settotal = { 'start': 0, 'end': 0, 'direction': '', 'diff': 0};

  data.forEach(stick => {
    if(i <= 2){
      if(i == 0) settotal.start = stick.price;
      set.push(stick);
      if(i == 2){
            //create a total for each set of three sticks to be used for comparison
            settotal.end = stick.price;
            settotal.direction = settotal.start > settotal.end ? 'down' : 'up';
            settotal.diff = Math.round(Math.abs(settotal.start - settotal.end));
            set.push(settotal);
            settotal = { 'start': 0, 'end': 0, 'direction': '', 'diff': 0};
          }
      i++;
    }
    if(i > 2){
      //once index has reached 3, we push the set to the group data
      groupdata.push(set);
      set = [];
      i = 0;
    }
  });

  let trenddata = [];
  let diff = 0;
  let dir = '';
  let newset = [];

  //the next step goes through the sets from the groupdata, and combines them if they are going in the same direction.
  //so we making larger sets, grouped by direction, instead of sets of 3.

  //now loop through the sets of the groupdata
  groupdata.forEach((set,idx) => {
    if(idx > 0){
      //if the direction is the same, push this to a new set
      if(dir == set[3].direction){
        newset.push(set[0], set[1], set[2]);
      } else {
        //if direction changes, add new set to trenddata
        diff = Math.round(parseInt(newset[newset.length-1].close) - parseInt(newset[0].open)) ;
        trenddata.push({'dir': dir, 'diff': diff, 'set': newset });
        newset = [set[0], set[1], set[2]];
      }
    } else{
      //if index is 0, set default new set
      newset = [set[0], set[1], set[2]];
    }
    diff = set[3].diff;
    dir = set[3].direction;
  });

  console.log(util.inspect(groupdata,false,null));
  console.log(util.inspect(trenddata,false,null));

  //todo: this calc is not completed and still being worked on in terms of how it works.
  //the logic is incomplete and needs more work
  //another idea is to not have so many different groups and to go through each tick bars at a time.
  //if the direction keeps going one way, we consider this a potential Confirmation
  //if the direction then changes, we consider this a potential close Confirmation
  //if the direction keeps going the other way, we consider this a completed confirmation
  //the confirmation would be determined by how much change there is in both directions. (say only if it surpasses 3%)
}
