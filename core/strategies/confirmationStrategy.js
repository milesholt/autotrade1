
let actions = {};
const { from, range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const util = require('util');
const moment=require('moment');

actions.determineConfirmations = async function(){

    //do waves
    var wavedata = [];
    var prices = close4;

    //console.log('Confirmation price data:');
  //console.log(prices);

    prices.forEach((closePrice,i) => {

      var close = closePrice;
      var open = open4[i];
      var dir = 'NEUTRAL';
      if(open > close) dir = 'DOWN';
      if(close > open) dir = 'UP'

      wavedata.push({ 'open': open, 'close': close, 'direction': dir, 'time': times4[i], 'remove':false });

    });
    // Push number of matching prices with matched value
    // if(match) mm.push({'idx':midx, 'integer': price,'prices': m, 'wavedata': wavedata, 'prices_idx':pi, 'price_diff': d, 'openclose_diff': ocd, 'time': pricedata[type][idx].time});
    // midx++;

  let waves = [];

  let w = {
    dir: null,
    wavecount: 0
  }

  // //1) Get points where there is change in direction
  wavedata.forEach((point,idx) => {
    if(idx > 0){
      //determine direction of next point
      let dir = '';
      let pw = wavedata;
      let prev = pw[idx-1];
      let last = pw.length-1;
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
    } else {
      //push first point
      waves.push(point);
    }
  });




  let rangeArea = highest4HourPrice - lowest4HourPrice;
  let pointPercLimit = confirmationPointPercLimit;

  // //2) Remove any points that are within percentage of the rangeArea to one another
  waves.forEach((point,idx)=>{
    if(idx > 0 && idx < waves.length-1){
      let prev = waves[idx-1];
      let diff = Math.abs(parseFloat((point.close - prev.close) / rangeArea).toFixed(2));
      if( diff <= pointPercLimit ) point.remove = true;
    }
  });
  waves = waves.filter(point => point.remove == false);


  //console.log(waves);


  // //3) Remove any duplicate points that are in the same direction and not a pivot point
  waves.forEach((point,idx)=>{
    if(idx > 0 && idx < waves.length-1){
      let next = waves[idx+1];
      if(point.direction == next.direction) point.remove = true;
    }
  });
  waves = waves.filter(point => point.remove == false);

  // //4) Count how many waves based on UP pivots within first and last
  // waves.forEach((point,idx) =>{
  //   if(idx > 0 && idx < waves.length-1){
  //     let prev = waves[idx-1];
  //     if(point.direction == 'UP' || (point.direction == 'NEUTRAL' && point.close > prev.close)) w.wavecount++;
  //   }
  // });

  //skip weekends
  waves.forEach(wave =>{
    //skip weekends
    let day = moment.utc(wave.time,'YYYY-MM-DD hh:mm:ss').format('ddd');
    wave.remove = false;
    if(day == 'Sat' || day == 'Sun') wave.remove = true;
  });

  waves = waves.filter(point => point.remove == false);

  //remove points in close proximity and choose highest/lowest
  let wavegroup = [];
  waves.forEach((wave,idx) =>{
    wave.remove=false;
  });
  waves.forEach((wave,idx) =>{
    if(idx > 0 && idx < waves.length-1){

      let next = waves[idx+1];
      let prev =waves[idx-1];
      let nextTime = next.time;
      let prevTime = prev.time;
      let nextTimeDiff = Math.abs(moment.utc(wave.time).diff(moment.utc(nextTime), "hours"));
      let prevTimeDiff = Math.abs(moment.utc(wave.time).diff(moment.utc(prevTime), "hours"));

      if(nextTimeDiff == 5 && prevTimeDiff == 5){
        //wavegroup.push([prev,wave,next]);
        let averageClose = (prev.close + wave.close + next.close)/3;
        wave.close = averageClose;
        prev.remove = true;
        next.remove = true;
      }
    }
  });
  waves = waves.filter(point => point.remove == false);

  //console.log('Confirmation waves:');
  //console.log(waves);



 if(trend4Hours !== 'ranging'){

   //do lines per point
   let pointDiff = Math.abs(first4HoursClose-last4HoursClose) / waves.length;

   let line_arr = {
     x:[],
     y:[]
   }

   waves.forEach((wave,idx) =>{
       //let linePoint = trend == 'bullish' ? firstClose + pointDiff : firstClose - pointDiff;
       let prevPoint = (idx > 0 && idx < waves.length-1) ? waves[idx-1].point : idx == 0 ? first4HoursClose : last4HoursClose;
       let linePoint = trend4Hours == 'bullish' ? prevPoint + pointDiff : prevPoint - pointDiff;
       line_arr.x.push(wave.time);
       line_arr.y.push(linePoint);
       wave.point = linePoint;
   });

   //do confirmations
   let confirmations_arr = {
     x:[],
     y:[],
     idx:[]
   }

   waves.forEach((wave,idx) =>{
     let linePoint  = parseFloat(line_arr.y[idx].toFixed(2));
     let offset = confirmationMarginOffset;
     let margin = (rangeArea * offset);
     let prevIdx = (idx-1) > 0 ?  (idx-1) : false;

     let prevConfirm = ((idx-1) > 0) && (confirmations_arr.idx.length)  ? confirmations_arr.idx[confirmations_arr.idx.length-1] : false;

     if(trend4Hours == 'bullish'){
       if(wave.close < linePoint - margin){
         if(prevConfirm !== (idx-1)){
           confirmations_arr.y.push(wave.close);
           confirmations_arr.x.push(wave.time);
           confirmations_arr.idx.push(idx);
         }
       }
     } else {
       if(wave.close > linePoint + margin){
          if(prevConfirm !== (idx-1)){
            confirmations_arr.y.push(wave.close);
            confirmations_arr.x.push(wave.time);
            confirmations_arr.idx.push(idx);
          }
       }
     }
   });

   confirmationData.waves = waves;
   confirmationData.trendPoints = line_arr;
   confirmationData.confirmationPoints = confirmations_arr;

 }

}

// actions.determineMidTrend = async function(gidx,pidx,epic,params){
//   //console.log(epic);
//
//   console.log('doing half trend');
//
//     //do waves
//     var wavedata = [];
//
//     const startTime = times4[0];
//     const midTime = times4[Math.round(times4.length/2)];
//     const endTime = times4[times4.length-1];
//
//     let firstClose = first4HoursClose;
//     let midClose = close4[Math.round(close4.length/2)];
//     let lastClose = last4HoursClose;
//
//     let trend = trend4Hours;
//
//     if(trend !== 'ranging'){
//
//       confirmationData.midTrend = {
//         'midClose': midClose,
//         'lastClose' : lastClose,
//         'midTime' : midTime,
//         'endTime': endTime,
//         'isNotRanging':
//       };
//
//     }
// }

module.exports = {
  actions: actions
}
