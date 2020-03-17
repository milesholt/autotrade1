
let actions = {};

actions.calcResistSupport = async function(pricedata,type){

  let prices = pricedata[type].map(r => parseInt(r.price));
  let margin = 5 //the smaller the margin, the more accurate

  //sort newdata by order
  prices.sort(sortNumber);

  //console.log(type);
  //console.log(prices);

  let matches = [];
  let line = 0;

  //loop through min and max values of prices
  let midx = 0;
  for(let i = prices[0], len = prices[prices.length - 1]; i <= len; i++){
    let match = false
    let m = [];
    let pi = []

    //for each value, find the difference for each price
    prices.forEach((price,pidx) => {

      price = parseFloat(price);
      let diff = Math.abs(price - i);

      //if the difference is small (eg. 2 ), count as a potential match
      if(diff <= margin){
        match = true;
        //push each price as part of that match
        m.push(price);
        pi.push(pidx);
      }
    });
    //push number of matching prices with matched value
    if(match) matches.push({'idx':midx, 'integer': i.toFixed(2),'prices': m, 'prices_idx':pi});
    //if(match) matches.push({'integer': i.toFixed(2),'prices': m });
    midx++;
  }

  //console.log(matches);
  //console.log(confirmations[type]);

  //loop through matches
  matches.forEach(match =>{

    //if value has the greatest number of low / high prices, this becomes the support / resistance line
    if(match.prices.length >= confirmations[type]){
      line = match.integer;
      //console.log(line);
      //console.log(match);
      confirmations[type] = match.prices.length;
      confirmations[type+'_index'] = match.prices_idx;
    }
  });

  return line;
}

actions.calcWicks = async function(pricedata){

  //set how many wicks to check
  let wicklimit = 3;
  let strengthlimit = 20;
  let wickdata = [];
  let beardir = bulldir = 0;
  let dir = '';
  let strength = false;
  let confirmation1 = false;
  let confirmation2 = false;

  for(let i = (pricedata.support.length-wicklimit) , len = pricedata.support.length-1; i <= len; i++){

    let pricebar = pricedata.support[i];
    let open = pricebar.open;
    let close = pricebar.close;
    let highest = pricebar.high;
    let lowest = pricebar.low;

    //get total difference of price bar
    let pricediff = Math.round(highest - lowest);

    //get percentage of bearish resistance (top wick)
    let topwick = ((highest - (open > close ? open : close)) /  pricediff) * 100;

    //get percentage of bullish resistance (bottom wick)
    let botwick = (((open < close ? open : close) - lowest) /  pricediff) * 100;

    //get difference in percentage between wick and non-wick to determine wick strength
    let wickstrength = 100 - ((Math.abs(open - close) / pricediff) * 100);

    topwick > botwick ? beardir++ : bulldir++;

    wickdata.push({'pricediff': pricediff, 'topwick': Math.round(topwick), 'botwick': Math.round(botwick), 'wickstrength': Math.round(wickstrength), 'direction': (topwick > botwick ? 'down' : 'up') });

  }

  resistance = bulldir > beardir ? 'bullish' : 'bearish';
  strength = Math.abs(wickdata[0].wickstrength - wickdata[2].wickstrength);

  //is wicks percentage change of strength greater than 50%?
  if (strength >= strengthlimit) confirmation1 = true;

  //is wick resistance growing?
  if (wickdata[0].wickstrength < wickdata[2].wickstrength) confirmation2 = true;

  wickdata.push({'resistance': resistance, 'strength': strength, 'confirmation1': confirmation1, 'confirmation2': confirmation2});

  //wickdata.push({'resistance': resistance, 'strength': strength, 'confirmation1': true, 'confirmation2': true});

  return wickdata;

}

function sortNumber(a, b) {
  return a - b;
}


module.exports = {
  actions: actions
}
