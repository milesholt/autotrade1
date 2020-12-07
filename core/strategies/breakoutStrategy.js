
let actions = {};
const { from, range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const util = require('util');

actions.calcResistSupport = async function(pricedata,type){

  let prices = pricedata[type].map(r => parseFloat((r.open+r.close)/2).toFixed(2) );
  let range = [];

  pricedata[type].forEach(price =>{
    range.push(price.low);
    range.push(price.high);
  });

  range.sort(sortNumber);

  const lowestnum = range[0];
  const highestnum = range[range.length-1];
  let rangediff = highestnum - lowestnum;
  let line = 0;
  let midx = 0;

  //NEW LOGIC
  /*
  loop through margin1, starting from 0.1 to maximum (0.3)
  If number of pricebars in range is 12 or more, count this as primary (with the smallest margin)
  Then check for bumps, if bumpgroundcount is over maximum group, go to the next margin
  As soon as margin with the least amount of bump groups, and smallest at least 12 price bars, this becomes the primary
  If rangedata is less 12 or too many bump groups, handle this and declare no range
  */

  let marginPercs = [];
  let maxmargin = breakoutMaxMargin; //40% of price difference
  let inc = 0.01;

  for ( var i=0.1, l=(maxmargin+inc); i<=l; i+=inc ){
    let v = parseFloat(i.toFixed(2));
    marginPercs.push(v);
  }

  let rangeOptions = [];
  marginPercs.forEach(margin => {

    //do range
    let mm = [];
    prices.forEach((price,idx) => {
      price = parseFloat(price);
      let match = false
      let m = [];
      let pi = []
      prices.forEach((price2,idx2) => {
        price2 = parseFloat(price2);
        let diff = Math.abs(price2 - price);
        //convert diff into percentage
        let diffPerc = (diff/rangediff*100);
        // If the difference is within margin, add it to matches
        if(diff <= margin){
          match = true;
          m.push(price2);
          pi.push(idx2);
        }
      });
      // Push number of matching prices with matched value
      if(match) mm.push({'idx':midx, 'integer': price,'prices': m, 'prices_idx':pi, 'time': pricedata[type][idx].time});
      midx++;
    });

    // Sort matches by order of how many cluster of prices each match has
    mm.sort(sortbyRangeCluster);

    // The one with the largest cluster (the last one in the order) is the data used to determine midrange line
    let range = mm[mm.length-1];
    rangeData[type] = range;

    //do lines
    let midrangeprices = deepCopy(range.prices).sort(sortNumber);
    let lowestprice = midrangeprices[0];
    let highestprice = midrangeprices[midrangeprices.length-1];


    //do bumps
    let rd = range.prices_idx;
    //console.log(rd);

    let bumps = [];
    pricedata[type].forEach((price,idx) => {
      if((price.close >= highestprice || price.close <= lowestprice) && rd.indexOf(idx) === -1 && (idx >= rd[0] && idx <= rd[rd.length-1])) {
        bumps.push({ 'idx' : idx, 'close' : price.close });
      }
    });
    let bidx = 0;
    let bumpgroupcount = 0;
    //this makes sure that the bumps are together as a group (not scattered indexes), and must exceed a certain amount
    bumps.forEach(bump => {
      if(bump.idx == (bidx+1)) bumpgroupcount++;
      bidx = bump.idx;
    });

    //rangeOptions.push({'margin': margin, 'rangeData': range, 'range': range.prices.length, 'bumps': bumps, 'bumpgroups' : bumpgroupcount, 'lowest': lowestprice, 'highest': highestprice});

    rangeOptions.push({'margin': margin, 'range': range, 'bumps': bumps, 'bumpgroups' : bumpgroupcount, 'lowest': lowestprice, 'highest': highestprice});
  });


  //console.log(util.inspect(rangeOptions, false, null));

  //console.log('determing range margin: ');
  let primaries = [];
  rangeOptions.forEach((r,idx)=>{
    let rangeCount = r.range.prices.length, bumpCount = r.bumps.length;
    if( rangeCount > 12){
      if(bumpCount < 5){
        primaries.push({'idx': idx, 'margin': r.margin, 'range' : r.range, 'rangeCount': rangeCount, 'bumps': r.bumps, 'bumpCount' : bumpCount,  'lowest': r.lowest, 'highest': r.highest});
      }
    }
  });

  if(primaries.length) {
    primaries = primaries.sort(sortbyRangeBumps);
    let primary = primaries[0];
    midrangeprice = (primary.highest + primary.lowest) / 2;
    lineData.midrange = midrangeprice;

    rangeData[type] = primary.range;
    console.log(primary);

    line = type == 'support' ? primary.lowest : primary.highest;
  } else{
    console.log('No range detected');

    line = lowestnum;
  }

  return line;

}

function sortNumber(a, b) {
  return a - b;
}

function sortbyRangeCluster(a, b) {
  return a.prices.length - b.prices.length;
}

function sortbyRangeBumps(a, b) {
  return a.bumps.length - b.bumps.length;
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
