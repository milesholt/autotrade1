
let actions = {};
const { from, range } = require('rxjs');
const { map, filter } = require('rxjs/operators');

actions.calcResistSupport = async function(pricedata,type){

  //1) Use a small margin (margin1) to locate midrange line - looking for the most number of prices that fit within a small margin
  //2) Once we have a group of prices within that margin, we find the medium average price which becomes the midrange line
  //3) We then use midrange line and loop through prices again, collecting only prices that are within margin2 from the midrange line
  //4) We then order those prices, and select the lowest for support, and the highest for resistance

  let prices = pricedata[type].map(r => ((r.open+r.close)/2).toFixed(2) );
  //Margins used for bitcoin
  //let margin1 = 50;  // Small margin, concentrating on the largest cluster of prices that fit within it, becoming the midrange line
  //let margin2 = 250; // High margin, to search for prices stemming from the midrange line, becoming support and resistance lines

  //TODO: Need to set margins as percentages of price data rather than fixed values
  let margin1 = 0.2;  // Small margin, concentrating on the largest cluster of prices that fit within it, becoming the midrange line
  let margin2 = 1; // High margin, to search for prices stemming from the midrange line, becoming support and resistance lines
  let matches = []; // Matches for midrange line
  let matches2 = []; // Matches for support and resistance lines
  let line = 0;
  let midx = 0;

  prices.forEach((price,idx) => {
    price = parseFloat(price);
    let match = false
    let m = [];
    let pi = []
    prices.forEach((price2,idx2) => {
      price2 = parseFloat(price2);
      let diff = Math.abs(price2 - price);
      // If the difference is within margin, add it to matches
      if(diff <= margin1){
        match = true;
        m.push(price2);
        pi.push(idx2);
      }
    });
    // Push number of matching prices with matched value
    if(match) matches.push({'idx':midx, 'integer': price,'prices': m, 'prices_idx':pi, 'time': pricedata[type][idx].time});
    midx++;
  });

  // Sort matches by order of how many cluster of prices each match has
  matches.sort(sortbyRangeCluster);

  // The one with the largest cluster (the last one in the order) is the data used to determine midrange line
  rangedata[type] = matches[matches.length-1];

  // Get low/highest point depending on line type
  let midrangeprices = deepCopy(rangedata[type].prices).sort(sortNumber);
  let lowestprice = midrangeprices[0];
  let highestprice = midrangeprices[midrangeprices.length-1];
  // Get the midrange line by getting the average of those prices
  let midrangeprice = (highestprice + lowestprice) / 2;

  linedata.midrange = midrangeprice;

  //BEGIN SECOND ROUND USING MID AREA PRICE

  // Loop through prices again
  rangedata[type].prices.forEach((price,idx) => {
    price = parseFloat(price);
    let match = false
    let m = [];
    let pi = []
    // Use midrange and margin2 to collect data
    let diff = Math.abs(price - midrangeprice);
    if(diff <= margin2){
      match = true;
      m.push(price);
      pi.push(idx);
    }
    if(match) matches2.push(price);
    midx++;
  });

  // Sort newdata by order
  matches2.sort(sortNumber);

  // Get lowest and highest prices from secondary matches
  lowestareaprice = matches2[0];
  highestareaprice = matches2[matches2.length-1];

  // Set support and resistance lines depending on type
  line = type == 'support' ? lowestareaprice : highestareaprice;

  return line;

}


actions.calcWicks = async function(pricedata){

  //set how many wicks to check
  let wicklimit = 3;
  let strengthlimit = 25;
  let wickdata = [];
  let beardir = bulldir = 0;
  let dir = '';
  let strength = false;
  let topstrength = 0;
  let botstrength = 0;
  let wickstrength = 0;
  let resistance = 'none';
  let confirmation1 = false;
  let confirmation2 = false;

  for(let i = (pricedata.support.length-wicklimit) , len = pricedata.support.length-1; i <= len; i++){

    let pricebar = pricedata.support[i];
    let open = pricebar.open;
    let close = pricebar.close;
    let highest = pricebar.high;
    let lowest = pricebar.low;
    let time = pricebar.time;
    let closeAsk = pricebar.closeAsk;

    //get total difference of price bar
    let pricediff = Math.round(highest - lowest);

    //get percentage of bearish resistance (top wick)
    let topwick = ((highest - (open > close ? open : close)) /  pricediff) * 100;

    //get percentage of bullish resistance (bottom wick)
    let botwick = (((open < close ? open : close) - lowest) /  pricediff) * 100;

    //get difference in percentage between wick and non-wick to determine wick strength
    let wickstrength = 100 - ((Math.abs(open - close) / pricediff) * 100);

    //topwick > botwick ? beardir++ : bulldir++;

    wickdata.push({'time': time, 'closeAsk': closeAsk, 'pricediff': pricediff, 'topwick': Math.round(topwick), 'botwick': Math.round(botwick), 'wickstrength': Math.round(wickstrength), 'direction': (topwick > botwick ? 'down' : 'up') });

  }

  //get difference of topwicks (first and last) and botwicks

  //topstrength = Math.abs(wickdata[0].topwick - wickdata[2].topwick);
  //botstrength = Math.abs(wickdata[0].botwick - wickdata[2].botwick);

  //updated method builds an array of all the top/bot wick values, and selects the largest using Max
  //this method selects the strongest wickend of the three, which includes the second wick

  let toparr = [], botarr = [], strengtharr = [];
  from(wickdata).pipe(map(val => val.topwick)).subscribe(val => toparr.push(val));
  from(wickdata).pipe(map(val => val.botwick)).subscribe(val => botarr.push(val));
  from(wickdata).pipe(map(val => val.wickstrength)).subscribe(val => strengtharr.push(val));

  topstrength = Math.max.apply( Math, toparr );
  botstrength = Math.max.apply( Math, botarr );
  wickstrength = Math.max.apply( Math, strengtharr );

  //depending on which wick end is greater, and if over strengthlimit, determines trend

  if((topstrength > botstrength) && (topstrength >= strengthlimit)) resistance = 'bearish';
  if((botstrength > topstrength) && (botstrength >= strengthlimit)) resistance = 'bullish';

  //strength is now only the strength of the latest wick
  //strength = wickdata[(wicklimit-1)].wickstrength;

  //update: we now choose wick with highest strength
  strength = wickstrength;

  //is wicks percentage change of strength greater than 50%?
  if (strength >= strengthlimit) confirmation1 = true;

  //is wick resistance growing?
  if (wickdata[0].wickstrength < wickdata[(wicklimit-1)].wickstrength) confirmation2 = true;

  wickdata.push({'resistance': resistance, 'strength': strength, 'confirmation1': confirmation1, 'confirmation2': confirmation2});

  //wickdata.push({'resistance': resistance, 'strength': strength, 'confirmation1': true, 'confirmation2': true});

  return wickdata;

}



function sortNumber(a, b) {
  return a - b;
}

function sortbyRangeCluster(a, b) {
  return a.prices.length - b.prices.length;
}

function deepCopy(origObj){
  var newObj = origObj;
   if (origObj && typeof origObj === "object") {
       newObj = Object.prototype.toString.call(origObj) === "[object Array]" ? [] : {};
       for (var i in origObj) {
           newObj[i] = deepCopy(origObj[i]);
       }
   }
   return newObj;
}



module.exports = {
  actions: actions
}
