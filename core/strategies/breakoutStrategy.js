
let actions = {};
const { from, range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const util = require('util');
const moment=require('moment');

actions.calcResistSupport = async function(pricedata,type){

  //remove any pricedata where values are all 0
  pricedata[type] = pricedata[type].filter(price => price.open !== 0 && price.close !== 0 && price.high !== 0 && price.low !== 0);

  let prices = pricedata[type].map(r => parseFloat((r.open+r.close)/2).toFixed(2) );
  let range = [];

  pricedata[type].forEach(price =>{
    range.push(price.low);
    range.push(price.high);
  });

  range.sort(sortNumber);

  const lowestnum = range[0];
  const highestnum = range[range.length-1];
  let pricediff = highestnum - lowestnum;
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
  let maxmargin = breakoutMaxMargin; //% of price difference
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
      let pi = [];
      let d = [];
      let ocd = [];
      let dp;
      let open;
      let close;
      let dir;
      let wavedata = [];
      prices.forEach((price2,idx2) => {
        price2 = parseFloat(price2);
        let diff = parseFloat(Math.abs(price2 - price).toFixed(2));
        let openclose_diff = parseFloat(Math.abs(pricedata[type][idx2].open - pricedata[type][idx2].close).toFixed(2));
        //convert diff into percentage
        let diffPerc = parseFloat(((diff/pricediff)*100).toFixed(2));
        let marginPerc = parseFloat((margin*100).toFixed(2))  //convert 0.4 to 40%
        open = pricedata[type][idx2].open;
        close = pricedata[type][idx2].close;
        dir = 'NEUTRAL';
        if(open > close) dir = 'DOWN';
        if(close > open) dir = 'UP'

        // If the difference is within margin, add it to matches
        if(diffPerc <= marginPerc){
          match = true;
          m.push(price2);
          pi.push(idx2);
          ocd.push(openclose_diff);
          d.push(diff);
          wavedata.push({ 'open': open, 'close': close, 'direction': dir, 'time': pricedata[type][idx2].time, 'remove':false });
        }
      });
      // Push number of matching prices with matched value
      if(match) mm.push({'idx':midx, 'integer': price,'prices': m, 'wavedata': wavedata, 'prices_idx':pi, 'price_diff': d, 'openclose_diff': ocd, 'time': pricedata[type][idx].time});
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

    //do average difference
    var diffsum = 0;
    for( var i = 0; i < range.price_diff.length; i++ ){
        //diffsum += parseInt( range.price_diff[i], 10 ); //don't forget to add the base
        diffsum += parseFloat(range.price_diff[i].toFixed(2));
    }

    var avg = parseFloat((diffsum/range.price_diff.length).toFixed(3));

    //rangeOptions.push({'margin': margin, 'rangeData': range, 'range': range.prices.length, 'bumps': bumps, 'bumpgroups' : bumpgroupcount, 'lowest': lowestprice, 'highest': highestprice});

    rangeOptions.push({'margin': margin, 'range': range, 'bumps': bumps, 'bumpgroups' : bumpgroupcount, 'lowest': lowestprice, 'highest': highestprice, 'priceDifferenceAverage' : avg});
  });


  //console.log(util.inspect(rangeOptions, false, null));

  //console.log('determing range margin: ');
  let primaries = [];
  rangeOptions.forEach((r,idx)=>{
    let rangeCount = r.range.prices.length, bumpCount = r.bumps.length;
    if( rangeCount > 12){
      if(bumpCount < 5){
        primaries.push({'idx': idx, 'margin': r.margin, 'range' : r.range, 'rangeCount': rangeCount, 'bumps': r.bumps, 'bumpCount' : bumpCount,  'lowest': r.lowest, 'highest': r.highest, 'priceDifferenceAverage' : r.priceDifferenceAverage});
      }
    }
  });

  if(primaries.length) {

    //primaries = primaries.sort(sortbyRangeBumps);

    //sort by average difference
    primaries = primaries.sort(sortbyAverageDifference);

    //shortlist to 5 if more
    if(primaries.length > 5){
       primaries = primaries.slice(0,5);
       //then sort by latest date
       primaries = primaries.sort(sortbyDate);
    }

    let primary = primaries[0];

    //Remove any range data if there is enough after last bump
    if(primary.bumps.length > 0){
      let lastbump = primary.bumps[primary.bumps.length-1].idx;
      let newrange = [];
      primary.range.prices.forEach((price,idx) => {
        let pidx = primary.range.prices_idx[idx];
        if(pidx > lastbump) newrange.push({'price':price, 'idx':pidx});
      });

      if(newrange.length > 12) {
            let remove = (primary.range.prices.length - newrange.length);
            primary.range.prices.splice(0,remove);
            primary.range.prices_idx.splice(0,remove);
            primary.range.price_diff.splice(0,remove);
      }
    }


    //do waves

    let waves = [];

    let w = {
      dir: null,
      wavecount: 0
    }

    //1) Get points where there is change in direction
    primary.range.wavedata.forEach((point,idx) => {
      if(idx > 0){
        //determine direction of next point
        let dir = '';
        let pw = primary.range.wavedata;
        let prev = pw[idx-1];
        let last = pw.length-1;
        prev.idx = [idx-1];
        point.idx =idx;
        if(point.close > prev.close) dir = 'UP';
        if(point.close < prev.close) dir = 'DOWN';
        if(point.close == prev.close) dir = 'NEUTRAL';
        //determine if direction is same as before or different
        if(dir !== w.dir){
          //direction is different, mark point
          waves.push(prev);
          w.dir = dir;
        }
        if(idx == last) waves.push(point);
      }
    });

    let rangeArea = primary.highest - primary.lowest;

    //2) Remove any points that are close to each other, or within percentage of the rangeArea to one another
    waves.forEach((point,idx)=>{
      if(idx > 0 && idx < waves.length-1){
        let prev = waves[idx-1];
        let diff = Math.abs(parseFloat((point.close - prev.close) / rangeArea).toFixed(2));
        if( diff <= wavePointPercLimit ) point.remove = true;
      }
    });
    waves = waves.filter(point => point.remove == false);

    //3) Remove any duplicate points that are in the same direction and not a pivot point
    waves.forEach((point,idx)=>{
      if(idx > 0 && idx < waves.length-1){
        let next = waves[idx+1];
        if(point.direction == next.direction) point.remove = true;
      }
    });
    waves = waves.filter(point => point.remove == false);

    //skip weekends
    waves.forEach(wave =>{
      //skip weekends
      let day = moment.utc(wave.time,'YYYY-MM-DD hh:mm:ss').format('ddd');
      wave.remove = false;
      if(day == 'Sat' || day == 'Sun') wave.remove = true;
    });

    waves = waves.filter(point => point.remove == false);

    // //remove points in close proximity and choose highest/lowest
    let wavegroup = [];
    let removes = [];
    waves.forEach((wave,idx) =>{
      wave.remove=false;
    });

    //loop throgh waves and collect all points that are 1 hour next to each other as a group to remove
    waves.forEach((wave,idx) =>{
      if(idx > 0 && idx < waves.length-1){

        let next = waves[idx+1];
        let prev =waves[idx-1];
        let nextTime = next.time;
        let prevTime = prev.time;
        let nextTimeDiff = Math.abs(moment.utc(wave.time).diff(moment.utc(nextTime), "hours"));
        let prevTimeDiff = Math.abs(moment.utc(wave.time).diff(moment.utc(prevTime), "hours"));

        if(nextTimeDiff == 1 && prevTimeDiff == 1){
          //wavegroup.push([prev,wave,next]);
          let averageClose = (prev.close + wave.close + next.close)/3;
          wave.close = averageClose;
          prev.remove = true;
          next.remove = true;
          removes.push(idx);
        }
      }
    });

    //but from the group, we combine into one point instead, so keep the middle one as a point
    let keepidx = Math.round(removes.length/2);
    //console.log('keepidx: ' + keepidx);

    waves.forEach((wave,idx) =>{
      wave.remove = false;
      if(idx == removes[keepidx]) wave.remove = true;
    });

    waves = waves.filter(point => point.remove == false);

    //loop again and double check if there are still any points next to each other and remove last one
    waves.forEach((wave,idx) =>{
      if(idx > 0 && idx < waves.length-1){

        let next = waves[idx+1];
        let prev =waves[idx-1];
        let nextTime = next.time;
        let prevTime = prev.time;
        let nextTimeDiff = Math.abs(moment.utc(wave.time).diff(moment.utc(nextTime), "hours"));
        let prevTimeDiff = Math.abs(moment.utc(wave.time).diff(moment.utc(prevTime), "hours"));

        if(prevTimeDiff == 1 && nextTimeDiff > 1){
          wave.remove = true;
        }
      }
    });

    waves = waves.filter(point => point.remove == false);

    //loop again, check points are in alternating directions (so remove any middle points if three points are in the same direction)
    waves.forEach((wave,idx) =>{
      if(idx > 0 && idx < waves.length-1){

      let next = waves[idx+1];
      let prev =waves[idx-1];
      if(prev.close < wave.close && wave.close < next.close) wave.remove = true;
      if(prev.close > wave.close && wave.close > next.close) wave.remove = true;
      }
    });

    waves = waves.filter(point => point.remove == false);


    //This removes small waves within a set amount of hours
    //remove points in close proximity and choose highest/lowest

    //let wavegroup = [];
    // let hourthreshold = 5; //no waves if only 5 or less hours
    // waves.forEach((wave,idx) =>{
    //   wave.remove=false;
    // });
    // waves.forEach((wave,idx) =>{
    //   if(idx > 0 && idx < waves.length-1){
    //
    //     let next = waves[idx+1];
    //     let prev =waves[idx-1];
    //     let nextTime = next.time;
    //     let prevTime = prev.time;
    //     let nextTimeDiff = Math.abs(moment(wave.time).diff(moment(nextTime), "hours"));
    //     let prevTimeDiff = Math.abs(moment(wave.time).diff(moment(prevTime), "hours"));
    //
    //     if(nextTimeDiff <= hourthreshold && prevTimeDiff <= hourthreshold){
    //       //wavegroup.push([prev,wave,next]);
    //       let averageClose = (prev.close + wave.close + next.close)/3;
    //       wave.close = averageClose;
    //       prev.remove = true;
    //       next.remove = true;
    //     }
    //   }
    // });
    // waves = waves.filter(point => point.remove == false);


    //Remove any points if indexes are close as well
    // let indexthreshold = 4; //no waves if only 4 or less points
    // waves.forEach((wave,idx) =>{
    //   wave.remove=false;
    // });
    // waves.forEach((wave,idx) =>{
    //   if(idx > 0 && idx < waves.length-1){
    //
    //     let next = waves[idx+1];
    //     let prev =waves[idx-1];
    //     let nextTime = next.time;
    //     let prevTime = prev.time;
    //     let nextIndexDiff = Math.abs(wave.idx - next.idx);
    //     let prevIndexDiff = Math.abs(wave.idx - prev.idx);
    //
    //     if(nextIndexDiff <= indexthreshold && prevIndexDiff <= indexthreshold){
    //       //wavegroup.push([prev,wave,next]);
    //       let averageClose = (prev.close + wave.close + next.close)/3;
    //       wave.close = averageClose;
    //       prev.remove = true;
    //       next.remove = true;
    //     }
    //   }
    // });
    // waves = waves.filter(point => point.remove == false);

    //4) Count how many waves based on UP pivots within first and last
    waves.forEach((point,idx) =>{
      if(idx > 0 && idx < waves.length-1){
        let prev = waves[idx-1];
        if(point.direction == 'UP' || (point.direction == 'NEUTRAL' && point.close > prev.close)) w.wavecount++;
      }
    });

    //console.log(waves);
    //console.log(w.wavecount);

    rangeData.waves = waves;
    rangeData.wavecount = w.wavecount;
    rangeData.primaries = primaries;



    midrangeprice = (primary.highest + primary.lowest) / 2;
    lineData.midrange = parseFloat(midrangeprice.toFixed(2));

    rangeData[type] = primary.range;
    //console.log(primary);

    line = type == 'support' ? primary.lowest : primary.highest;
  } else{
    //console.log('No range detected');

    line = lowestnum;
    lineData.midrange = lowestnum;
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

function sortbyAverageDifference(a, b) {
  return a.priceDifferenceAverage - b.priceDifferenceAverage;
}

function sortbyDate(a, b) {
  return new Date(b.range.time) - new Date(a.range.time);
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
