
let actions = {};
const { from, range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const util = require('util');
const moment=require('moment');
moment().format();

actions.calcResistSupport = async function(pricedata,type){

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
  let pricediff = parseFloat((highestnum - lowestnum).toFixed(2));
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
  let maxmargin = 0.17; //% of price difference //official - 0.17
  let inc = 0.01;

  for ( var i=0, l=(maxmargin+inc); i<=l; i+=inc ){
    let v = parseFloat(i.toFixed(2));
    marginPercs.push(v);
  }



  console.log('priceDiff: '  + pricediff);

  let rangeOptions = [];
  marginPercs.forEach(margin => {

    //Get percentage of price range using margin percentages array
    //let margin = parseFloat(pricediff * marginPerc).toFixed(2);
    //console.log('margin: ' + margin);

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

        // if(idx == 0){
        //   console.log('diff:' + diff);
        //   console.log('perc:' + diffPerc);
        //   console.log('marginPerc: ' + marginPerc);
        // }

        // If the difference is within margin, add it to matches

        if(diffPerc <= marginPerc){
          match = true;
          m.push(price2);
          pi.push(idx2);
          ocd.push(openclose_diff);
          d.push(diff);
          wavedata.push({ 'open': open, 'close': close, 'direction': dir, 'time': pricedata[type][idx2].time });
        }
      });
      // Push number of matching prices with matched value
      if(match) mm.push({'idx':midx, 'integer': price,'prices': m, 'wavedata': wavedata, 'prices_idx':pi, 'price_diff': d, 'openclose_diff': ocd, 'time': pricedata[type][idx].time});
      midx++;
    });

    // Sort matches by order of how many cluster of prices each match has
    mm.sort(sortbyRangeCluster);

    //console.log(mm);

    // The one with the largest cluster (the last one in the order) is the data used to determine midrange line
    let range = mm[mm.length-1];
    rangeData[type] = range;

    //console.log(range);

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
    var oc_diffsum = 0;
    for( var i = 0; i < range.price_diff.length; i++ ){
        //diffsum += parseInt( range.price_diff[i], 10 ); //don't forget to add the base
        diffsum += parseFloat(range.price_diff[i].toFixed(2));
    }

    for( var i = 0; i < range.openclose_diff.length; i++ ){
        //diffsum += parseInt( range.price_diff[i], 10 ); //don't forget to add the base
        oc_diffsum += parseFloat(range.openclose_diff[i].toFixed(2));
    }

    var avg = parseFloat((diffsum/range.price_diff.length).toFixed(3));
    var oc_avg = parseFloat((oc_diffsum/range.openclose_diff.length).toFixed(3));

    //rangeOptions.push({'margin': margin, 'rangeData': range, 'range': range.prices.length, 'bumps': bumps, 'bumpgroups' : bumpgroupcount, 'lowest': lowestprice, 'highest': highestprice});

    rangeOptions.push({'margin': margin, 'range': range, 'bumps': bumps, 'bumpgroups' : bumpgroupcount, 'lowest': lowestprice, 'highest': highestprice,'openCloseDifferenceAverage': oc_avg,'priceDifferenceAverage' : avg });
  });


  //console.log(util.inspect(rangeOptions, false, null));

  //console.log('determing range margin: ');
  let primaries = [];
  rangeOptions.forEach((r,idx)=>{
    let rangeCount = r.range.prices.length, bumpCount = r.bumps.length;
    if( rangeCount > 12){
      if(bumpCount < 5){
        primaries.push({'idx': idx, 'margin': r.margin, 'range' : r.range, 'rangeCount': rangeCount, 'bumps': r.bumps, 'bumpCount' : bumpCount,  'lowest': r.lowest, 'highest': r.highest, 'openCloseDifferenceAverage': r.openCloseDifferenceAverage, 'priceDifferenceAverage' : r.priceDifferenceAverage });
      }
    }
  });



  if(primaries.length) {
    //primaries = primaries.sort(sortbyRangeBumps);

    //sort by average difference
    primaries = primaries.sort(sortbyAverageDifference);
    //primaries = primaries.sort(sortbyOpenCloseDifferenceAverage);

    // primaries.forEach(primary => {
    //   console.log(primary.openCloseDifferenceAverage);
    // })

    //console.log(primaries);
    //console.log(util.inspect(primaries, false, null));

    //shortlist to 5 if more
    // if(primaries.length > 5){
    //    primaries = primaries.slice(0,5);
    //    //then sort by latest date
    //    primaries = primaries.sort(sortbyDate);
    // }

    //select the primary in the middle, rather than one with the smallest average difference
    let mid = Math.round(primaries.length/2);
    console.log('midprimary:' + mid);

    let third = Math.round(primaries.length/3);

    let quarter = Math.round(primaries.length/4);

    let primary = primaries[third];

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
            console.log('remove: ' + remove);
            primary.range.prices.splice(0,remove);
            primary.range.prices_idx.splice(0,remove);
            primary.range.price_diff.splice(0,remove);
      }
    }

    //console.log(primary);

    //do waves
    /*
    loop through range data
    find out which direction it's going first (start of wave formation)
    then get the highest or lowest depending on trend
    then look for the opposite (peak of wave)
    then find again the opposite (end of wave) at this point, count as one wave and add to waves
    then continue the same until end of range data
    */

    //process2:
    //count direction based on 2 price bars
    //as soon as it goes 2 price bars in the oppposite direction, we mark the last direction as a turning point

    let waves = [];
    var rdir;
    let barcount = 0;

    let wprop = {
      dir: null,
      barcount: 1
    }

    //console.log(primary.range.wavedata);


    //First loop - set any price bars that are NEUTRAL to previous direction if previous is not NEUTRAL
    //This is to include NEUTRAL price bars as part of the direction of the previous
    primary.range.wavedata.forEach((r,idx) => {
      if(r.direction == 'NEUTRAL'){
        let previous = primary.range.wavedata[idx-1];
        if(previous.direction !== 'NEUTRAL') r.direction = previous.direction;
      }
    });


    //Second loop - go through and mark changes

    primary.range.wavedata.forEach((r,idx) => {
        if(r.direction !== 'NEUTRAL') {
          if(r.direction == wprop.dir) {
            if(idx == primary.range.wavedata.length-1 ) waves.push(r);
          } else {
            waves.push(primary.range.wavedata[idx]);
            wprop.dir = r.direction;
          }
        }
    });


    //Third loop - clean up marks
    let waves2 = [];

    waves.forEach((wave,idx) => {


      //mark the First and last
      if (idx == 0 || idx == (waves.length-1)) waves2.push(wave);

      //mark anything more than two hours in different direction
      if(idx > 1){
        const start = moment(wave.time);
        const end = moment(waves[idx-1].time);
        diff = Math.abs(end.diff(start, "hours") - 1);
        if(diff > 2)  waves2.push(wave);
      }

    });

    //Fourth loop - remove any duplicates
    let waves3 = waves2.filter((w,idx) => idx > 0 && w.time !== waves2[idx-1].time);
    waves3.unshift(waves2[0]); //bring back first


    console.log(waves3)














    //Then loop through again and count waves
    // primary.range.wavedata.forEach((r,idx) => {
    //     if(r.direction !== 'NEUTRAL') {
    //       if(r.direction == wprop.dir) {
    //         if(idx == primary.range.wavedata.length-1 ) waves.push(r);
    //         wprop.barcount++;
    //       } else {
    //         console.log('change');
    //         console.log('barcount: ' + wprop.barcount);
    //         if(wprop.barcount >= 2){
    //           console.log('barcount: ' + wprop.barcount);
    //           console.log('MARK! -- ' + primary.range.wavedata[idx-1].direction);
    //           // if(waves.length == 0){
    //           //     waves.push(primary.range.wavedata[idx-2]);
    //           // }
    //           waves.push(primary.range.wavedata[idx-2]);
    //
    //           wprop.barcount = 1;
    //         }
    //         wprop.dir = r.direction;
    //       }
    //     }
    //     console.log(r);
    // });

    //console.log(waves);

    //clean up waves (merge duplicate directions, where trend continues)
    // let duplicates = [];
    // waves.forEach((wave,idx) =>{
    //   if(idx > 0) if(wave.direction == waves[idx-1].direction) duplicates.push(idx-1);
    // });
    //
    // duplicates.forEach(didx => {
    //   waves.splice(didx,1);
    // });
    //
    // console.log(waves);

    let w = {
      wavecount: 0,
      waveidx:0
    };

    // waves3.forEach((wave,idx) => {
    //   if(w.waveidx == 2){ w.wavecount++; w.waveidx=0 }; w.waveidx++;
    // });

    let waves4 = [];

    waves3.forEach((wave,idx) =>{
      if(idx > 0){
        if(wave.direction !== waves3[idx-1].direction) w.wavecount++;
        if(w.wavecount == 2){
          waves4.push([waves3[idx-2],waves3[idx-1],waves3[idx]]);
          w.wavecount = 0;
        }
      }
    });

    console.log(waves4);

    console.log(w.wavecount);

    rangeData.waves = waves3;

    midrangeprice = (primary.highest + primary.lowest) / 2;
    lineData.midrange = midrangeprice;

    rangeData[type] = primary.range;
    //console.log(primary);

    line = type == 'support' ? primary.lowest : primary.highest;
  } else{
    console.log('No range detected');
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

function sortbyOpenCloseDifferenceAverage(a, b) {
  return a.openCloseDifferenceAverage - b.openCloseDifferenceAverage;
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
