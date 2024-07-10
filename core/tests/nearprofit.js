//Dummy
const pricedata3 = {
  'support': [{'closeAsk':200, 'closeBid':200},{'closeAsk':190, 'closeBid':190},{'closeAsk':150, 'closeBid':150},{'closeAsk':120, 'closeBid':120}]
}

// const pricedata3 = {
//   'support': [{'closeAsk':100, 'closeBid':100},{'closeAsk':120, 'closeBid':120},{'closeAsk':150, 'closeBid':150},{'closeAsk':180, 'closeBid':180}]
// }
const x = {
  newLimit: 205
}
const d = {
  closePrice: { ask : 100, bid : 100},
  openPrice: 90
}
const priceDiff = 40;

//Config
const nearoffsetPerc = 0.05; //set near offset to 5%
const hourspassed = 4;
const priceDiffThreshold = 40;
const dir = 'BUY';
console.log(dir);

//Main

//Determine close price based on direction
let closePrice = dir == 'BUY' ? d.closePrice.bid : d.closePrice.ask;
console.log('closePrice: ' + closePrice);

//Determine near offset  based on direction. If BUY, the offset is % below newlimit, if SELL offset is % above
let nearoffset = dir == 'BUY' ? x.newLimit - (x.newLimit * nearoffsetPerc) : x.newLimit + (x.newLimit * nearoffsetPerc);

console.log('newLimit: ' + x.newLimit);
console.log('perc of newLimit: ' +  (x.newLimit * nearoffsetPerc));
console.log('nearoffset: ' + nearoffset);

//Determine pre close price (the close price a set number of hours before to determine trend)
let preClosePrice = dir == 'BUY' ? pricedata3.support[pricedata3.support.length-hourspassed].closeBid : pricedata3.support[pricedata3.support.length-hourspassed].closeAsk;
console.log('preClosePrice: ' + preClosePrice);

//Caluclate if preClosePrice is within nearoffset
let isNearProfit = dir == 'BUY' ? preClosePrice >= nearoffset : preClosePrice <= nearoffset

//if preClosePrice was within offset and near profit
if(isNearProfit) {

  //First, get difference of current closePrice with preClosePrice
  let checkPriceDiff = Math.abs(preClosePrice - closePrice);

  //Get percentage of this difference
  let checkPriceDiffPerc = parseFloat(Number(priceDiff / checkPriceDiff * 100).toFixed(2));
  console.log('checkPriceDiffPerc: ' + checkPriceDiffPerc);
  console.log('priceDiffThreshold: ' + priceDiffThreshold);

  //Determine if this difference is negative or in opposite direction to hitting profit
  let isOpposing = dir == 'BUY' ?  (closePrice - preClosePrice) < 0 : (preClosePrice - closePrice) < 0;

  //If trend is now moving in opposite direction and trend percentage is above threshold
  if(isOpposing && checkPriceDiffPerc >= priceDiffThreshold){
    console.log('Opposing trend detected in last set number of hours');

    //If current price is still in profit
    let isProfit = dir == 'BUY' ? (d.closePrice.bid - d.openPrice) > 0 : (d.openPrice -  d.closePrice.ask) > 0;

    if(isProfit){

        //Close as profit
        console.log('closing, is near profit and trend is changing.')
        //markets[x.marketId].closeprofit = true;
    } else {
        console.log('not closing');
    }
  } else {
    console.log('No opposite trend');
  }
} else {
  console.log('Not near profit');
}
