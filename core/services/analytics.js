var actions = {};
var core;
var lib;
var moment;
var cloud;
var log;

const { from, range } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const username = 'miles_holt';
const apikey = 'WGIhp2vCZ9C86KEkjEJf';
const streamtoken = 'vbey2uqiwm';
const userdetails = {
  username : username,
  apiKey : apikey,
  host: 'chart-studio.plotly.com'
};
var plotly = require('plotly')(userdetails,apikey);

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  lib = core.lib.actions;
  moment = core.moment;
  cloud = core.cloudHandler.actions;
  log = core.log.actions;
}

/*

DRAW CHART

*/

actions.drawChart = async function(priceData, lineData, analysis, rangeData){

  //priceData = priceData.filter(price => price.open !== 0 && price.close !== 0 && price.high !== 0 && price.low !== 0);

  //let toDelete = [];

  priceData.forEach((price,idx) =>{
      if(price.closeAsk == null || price.closeBid == null){
        console.log('--------------price data has zero');
        //toDelete.push(idx);
      }
    });

  // toDelete.forEach(didx =>{
  //   priceData.splice(didx,1);
  // });


  let isRange = true;

  //console.log(lineData.resistance);
  //console.log(lineData.support);
  //console.log(lineData.midrange);


  if(lineData.support === lineData.midrange && lineData.midrange === lineData.resistance) isRange = false;

  //console.log('isRange: ' + isRange);

  let shapes = [];

  const circleheight = parseFloat((priceDiff * 0.013).toFixed(3)); //get fraction of height, so it's in proportion to data range
  //console.log('circleheight: ' + circleheight);

  //skip first 12 hours
  //let priceData2 = priceData.slice(12, priceData.length);
  let priceData2 = pricedata2.support;
  let midprices = priceData2.map(r => (parseFloat((r.open+r.close)/2).toFixed(2)));

  //customdata[customdata.length-1] = analysis;

  let starttime =  times[0];
  let starttime2 = times[11]; //12 hours ahead (range area needs to be 24 hours not 36)
  let endtime = times[times.length-1];

  //let lastClose =  parseFloat(closes[closes.length-1]);
  let lastRangeIndex = rangeData.support.prices_idx[rangeData.support.prices_idx.length-1];
  //console.log(lastRangeIndex);

  //let lastData = pricedata2[lastRangeIndex];

  let lastTimeStart = moment(lastTime).subtract(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let lastTimeEnd = moment(lastTime).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');

  //console.log('lastTime: ' + lastTime);
  //console.log('lastClose: ' + lastClose);

  //Momentum area - Buy - threshold passed opens trade
  //let momentumLimitBuyArea0 = lineData.resistance;
  //let momentumLimitBuyArea1 = parseFloat(lineData.resistance + parseFloat(momentumLimit)).toFixed(2);

  //Momentum area - SELL - threshold passed opens trade
  //let momentumLimitSellArea0 = lineData.support;
  //let momentumLimitSellArea1 = parseFloat(lineData.support - parseFloat(momentumLimit)).toFixed(2);

  //Momentum limit lines - limit when passed opens trade
  let momentumLimitBuyLine = parseFloat(lineData.resistance + parseFloat(momentumLimit)).toFixed(2);
  let momentumLimitSellLine = parseFloat(lineData.support - parseFloat(momentumLimit)).toFixed(2);

  //Trade limit lines - limit when passed prevents trade
  let tradeLimitBuyLine = parseFloat(lineData.resistance + parseFloat(tradelimit)).toFixed(2);
  let tradeLimitSellLine = parseFloat(lineData.support - parseFloat(tradelimit)).toFixed(2);

  //line distance limit area
  let lineDistanceLimitArea0 = parseFloat(lineData.midrange + parseFloat(linedistancelimit/2)).toFixed(2);
  let lineDistanceLimitArea1 = parseFloat(lineData.midrange - parseFloat(linedistancelimit/2)).toFixed(2);


  //console.log('SORTING RANGE DATA FOR ANALYTICS-------------------');

  priceData2.forEach((price, i) =>{

      let range_col = 'rgba(217, 14, 87, 0.7)';
      let bump_col = 'rgba(92, 123, 207, 0.7)';

      let midprice = Math.abs(parseFloat(price.open+price.close)/2);
      let midplus = parseFloat(midprice+circleheight).toFixed(3);
      let midminus = parseFloat(midprice-circleheight).toFixed(3);
      midprice = parseFloat(midprice).toFixed(2); //round it after setting midplus and minus, otherwise numbers are incorrect

      rangeData.support.prices_idx.forEach((pidx,ridx) => {

        if(pidx == i){
          let j = i+1;
          let circle = {
            type: 'circle',
            xref: 'x',
            yref: 'y',
            //fillcolor: rangeData.bumps[ridx].idx == i ? bump_col : range_col,
            fillcolor: range_col,
            line: {
              width: 0,
              dash:'solid'
            },
            //x0: moment(price.time).add(12, 'hours').subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            x0: moment(price.time).subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            y0: midplus,
            //x1: moment(price.time).add(12, 'hours').add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            x1: moment(price.time).add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            y1: midminus
          }
          if(isRange == true) shapes.push(circle);
        }
      });

      rangeData.bumps.forEach((bump,bidx) => {
          //console.log(pidx);
          //console.log(rangeData.support.prices[ridx]);
          if(bump.idx == i){
            let j = i+1;
            let circle = {
              type: 'circle',
              xref: 'x',
              yref: 'y',
              //fillcolor: rangeData.bumps[ridx].idx == i ? bump_col : range_col,
              fillcolor: bump_col,
              line: {
                width: 0,
                dash:'solid'
              },
              //x0: moment(price.time).add(12, 'hours').subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
              x0: moment(price.time).subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
              y0: midplus,
              //x1: moment(price.time).add(12, 'hours').add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
              x1: moment(price.time).add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
              y1: midminus
            }
            if(isRange == true) shapes.push(circle);
          }
      });
  });

  var trace1 = {
      x: times,
      close: closes,
      decreasing: {line: {color: '#F75D7C'}},
      high: highs,
      increasing: {line: {color: '#18DBB2'}},
      line: {color: 'rgba(31,119,180,1)', width: 4},
      low: lows,
      open: opens,
      type: 'candlestick',
      xaxis: 'x',
      yaxis: 'y'
  };

  var supportline = {
      type: 'line',
      y0: lineData.support,
      y1: lineData.support,
      x0: starttime2,
      x1: endtime,
      line: {
        color: '#D90E57', //red
        width: 4,
        dash: 'solid'
      },
      xref: 'x',
      yref: 'y',
      opacity: 0.3,
      layer: 'above'
    }

  var resistanceline = {
        type: 'line',
        y0: lineData.resistance,
        y1: lineData.resistance,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#1DC7C9', //green
          width: 4,
          dash: 'solid'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.3,
        layer: 'above'
  }

  var midrangeline = {
        type: 'line',
        y0: lineData.midrange,
        y1: lineData.midrange,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#1d39c9', //green
          width: 4,
          dash: 'dot'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.3,
        layer: 'above'
  }

  // var momentumareaBuy = {
  //       type: 'rect',
  //       y0: momentumLimitBuyArea0,
  //       y1: momentumLimitBuyArea1,
  //       x0: lastTimeStart,
  //       x1: lastTimeEnd,
  //       line: {
  //         color: '#530EE0', //dark purple
  //         width: 0,
  //         dash: 'solid'
  //       },
  //       fillcolor: '#48c27a',
  //       xref: 'x',
  //       yref: 'y',
  //       opacity: 0.15,
  //       layer: 'above'
  // }
  //
  // var momentumareaSell = {
  //       type: 'rect',
  //       y0: momentumLimitSellArea0,
  //       y1: momentumLimitSellArea1,
  //       x0: lastTimeStart,
  //       x1: lastTimeEnd,
  //       line: {
  //         color: '#530EE0', //dark purple
  //         width: 0,
  //         dash: 'solid'
  //       },
  //       fillcolor: '#48c27a',
  //       xref: 'x',
  //       yref: 'y',
  //       opacity: 0.15,
  //       layer: 'above'
  // }

  var momentumlineBuy = {
        type: 'line',
        y0: momentumLimitBuyLine,
        y1: momentumLimitBuyLine,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#48c27a', //green
          width: 4,
          dash: 'dot'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }

  var momentumlineSell = {
        type: 'line',
        y0: momentumLimitSellLine,
        y1: momentumLimitSellLine,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#48c27a', //green
          width: 4,
          dash: 'dot'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }

  var tradelineBuy = {
        type: 'line',
        y0: tradeLimitBuyLine,
        y1:  tradeLimitBuyLine,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#D90E57', //red
          width: 4,
          dash: 'dot'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }

  var tradelineSell = {
        type: 'line',
        y0: tradeLimitSellLine,
        y1:  tradeLimitSellLine,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#D90E57', //red
          width: 4,
          dash: 'dot'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }



  var stopDistanceLine = {
        type: 'line',
        y0: stopDistanceLevel,
        y1:  stopDistanceLevel,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#333',
          width: 4,
          dash: 'solid'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }


  var limitDistanceLine = {
        type: 'line',
        y0: limitDistanceLevel,
        y1: limitDistanceLevel,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#333',
          width: 4,
          dash: 'solid'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }



  var minimumarea = {
        type: 'rect',
        y0: lineDistanceLimitArea0,
        y1: lineDistanceLimitArea1,
        x0: starttime2,
        x1: endtime,
        line: {
          color: '#F6A900', //orange
          width: 0,
          dash: 'solid'
        },
        fillcolor: '#F6A900',
        xref: 'x',
        yref: 'y',
        opacity: 0.26,
        layer: 'above'
  }

  let waves_arr = {
    x:[],
    y:[]
  }

  rangeData.waves.forEach(wave =>{
    waves_arr.x.push(wave.time);
    waves_arr.y.push(wave.close);
  });

  var trace2 = {
      x: waves_arr.x,
      y: waves_arr.y,
      mode: 'lines+markers',
      name: 'spline',
      line: { shape: 'spline', width: 2, color:'#000000'},
      type: 'scatter'
  };

  var traces = [trace1];
  if(isRange == true) traces.push(trace2);

  var data = traces;

  //if lines are the same, it means there is no range, otherwise apply all lines when there is a range
  if(isRange == true) shapes.push(supportline, resistanceline, midrangeline, momentumlineBuy, momentumlineSell, tradelineBuy, tradelineSell, minimumarea);
  if(limitDistanceLevel > 0 && stopDistanceLevel > 0) shapes.push(stopDistanceLine, limitDistanceLine);


var rBreak = [];

// if(epic == 'KA.D.INRG.DAILY.IP'){
//   rBreak = [
//     {
//       enabled:true,
//       bounds: ['sat', 'mon']
//     },
//     {
//       enabled:true,
//       bounds: [16,8],
//       pattern: "hour"
//     }
//   ]
//
// } else if (epic == 'CC.D.W.USS.IP'){
//
//   rBreak = [
//     {
//       enabled:true,
//       bounds: ['sat', 'mon']
//     },
//     {
//       enabled:true,
//       bounds: [19,1],
//       pattern: "hour"
//     }
//   ]
//
// } else {
//   rBreak = [
//     {
//       enabled:true,
//       bounds: ['sat', 'mon']
//     }
//   ]
// }

rBreak = [
  {
    enabled:true,
    bounds: ['sat', 'mon']
  },
  {
    enabled:true,
    bounds: market.marketClosed,
    pattern: "hour"
  }
]


  var layout = {
    dragmode: 'zoom',
    margin: {
      r: 10,
      t: 25,
      b: 40,
      l: 60
    },
    showlegend: false,
    xaxis: {
      autorange: true,
      domain: [0, 1],
      range: [starttime, endtime],
      rangeslider: {range: [starttime, endtime]},
      rangebreaks: rBreak,
      title: 'Date',
      type: 'date'
    },
    yaxis: {
      autorange: false,
      domain: [0, 1],
      range:[lowestPrice,highestPrice],
      type: 'linear'
    },
    shapes:shapes
  };

  var options = {
    "filename": "analytics-" + market.alias,
    "fileopt": "overwrite",
    layout,
    "world_readable": true
  }


    let d = {
      traces: data,
      layout: layout,
      waves: rangeData.waves,
      wavecount: rangeData.wavecount
    }




    //var plotDir = 'core/data/'+market.epic+'/'+market.epic+'_plotdata.js';
    //console.log(jsonDir);
    //cloud.updateFile(json,jsonDir);

    log.plotLog(d);


  // plotly.plot(data, options, function (err, msg) {
  //   if (err) return console.log(err);
  //   console.log(msg);
  // });

  var chart = { 'data': [ data ], 'layout':layout };
  //actions.getImage(chart);
}



/*

DRAW CHART

*/

actions.drawChart4Hours = async function(){




  let shapes = [];
  let lowest4 = lowest4HourPrice;
  let highest4 = highest4HourPrice;
  let starttime =  prices_4hour[0].snapshotTime.replace(/\//g, '-');
  let endtime = prices_4hour[ prices_4hour.length-1].snapshotTime.replace(/\//g, '-');



  var trace1 = {
      x: times4,
      close: close4,
      decreasing: {line: {color: '#F75D7C'}},
      high: highs4,
      increasing: {line: {color: '#18DBB2'}},
      line: {color: 'rgba(31,119,180,1)', width: 4},
      low: lows4,
      open: open4,
      type: 'candlestick',
      xaxis: 'x',
      yaxis: 'y'
  };

  var traces = [trace1];

  if(trend4Hours !== 'ranging'){
    var trace2 = {
          x: confirmationData.waves.x,
          y: confirmationData.waves.y,
          mode: 'lines+markers',
          name: 'spline',
          opacity: 0.5,
          line: { shape: 'spline', width: 2, color:'#000000'},
          type: 'scatter'
    };

    var trace3 = {
            x: confirmationData.trendPoints.x,
            y: confirmationData.trendPoints.y,
            mode: 'lines',
            line: { width: 2, color:'rgb(219, 64, 82)'}
    };

    var trace4 = {
            x: confirmationData.confirmationPoints.x,
            y: confirmationData.confirmationPoints.y,
            mode: 'markers',
            marker: {
              size: 12,
              opacity: 0.8,
              color:'rgb(300, 164, 82)'
            }
     };

     traces.push(trace2,trace4);
  }

  var data = traces;

  //trend for 4 hours graph
  // var first4HoursClose = close4[0];
  // var last4HoursClose = close4[ close4.length-1];
  //
  // let trend4HoursDiff = parseFloat(Math.abs(first4HoursClose - last4HoursClose).toFixed(2));
  // let trend4HoursDiffPerc = Math.abs(100 - (first4HoursClose / last4HoursClose * 100)).toFixed(2);
  //
  // //if prices have moved and over significant distance (range area limit)
  // if((first4HoursClose > last4HoursClose) && (trend4HoursDiff >= rangelimit)) trend4Hours = 'bearish';
  // if((first4HoursClose > last4HoursClose) && (trend4HoursDiff >= rangelimit)) trend4Hours = 'bullish';


  var trendLine = {
        type: 'line',
        y0: first4HoursClose,
        y1: last4HoursClose,
        x0: starttime,
        x1: endtime,
        line: {
          color: '#333',
          width: 4,
          dash: 'solid'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }
  shapes.push(trendLine);

  if(midtrend4Hours !== 'ranging'){
    var midtrendLine = {
                   type: 'line',
                   y0: mid4HoursClose,
                   y1: last4HoursClose,
                   x0: times4[Math.round(times4.length / 2)],
                   x1: endtime,
                   line: {
                     color: 'rgb(219, 64, 82)',
                     width: 4,
                     dash: 'solid'
                   },
                   xref: 'x',
                   yref: 'y',
                   opacity: 0.5,
                   layer: 'above'
             }

    shapes.push(midtrendLine);
  }

//hide hours outside of 8am-4pm
// {
//   enabled:true,
//   bounds: [16, 8],
//   pattern: "hour"
// }

var rBreak = [];

// if(epic == 'KA.D.INRG.DAILY.IP'){
//   rBreak = [
//     {
//       enabled:true,
//       bounds: ['sat', 'mon']
//     },
//     {
//       enabled:true,
//       bounds: [16,8],
//       pattern: "hour"
//     }
//   ]
//
// } else if (epic == 'CC.D.W.USS.IP'){
//
//   rBreak = [
//     {
//       enabled:true,
//       bounds: ['sat', 'mon']
//     },
//     {
//       enabled:true,
//       bounds: [19,1],
//       pattern: "hour"
//     }
//   ]
//
// } else {
//   rBreak = [
//     {
//       enabled:true,
//       bounds: ['sat', 'mon']
//     }
//   ]
// }

rBreak = [
  {
    enabled:true,
    bounds: ['sat', 'mon']
  },
  {
    enabled:true,
    bounds: market.marketClosed,
    pattern: "hour"
  }
]


  var layout = {
    dragmode: 'zoom',
    margin: {
      r: 10,
      t: 25,
      b: 40,
      l: 60
    },
    showlegend: false,
    xaxis: {
      autorange: true,
      domain: [0, 1],
      range: [starttime, endtime],
      rangeslider: {range: [starttime, endtime]},
      rangebreaks: rBreak,
      title: 'Date',
      type: 'date'
    },
    yaxis: {
      autorange: true,
      domain: [0, 1],
      range:[lowest4,highest4],
      type: 'linear'
    },
    shapes:shapes
  };

  var options = {
    "filename": "analytics-" + market.alias,
    "fileopt": "overwrite",
    layout,
    "world_readable": true
  }


    let d = {
      traces: data,
      layout: layout
    }

    log.plotLog4Hour(d);

}





actions.getImage = async function(chart){
  var pngOptions = { format: 'png', width: 1000, height: 500 };
  plotly.getImage(chart, pngOptions, function (err, imageData) {
    if (err) return console.log(err);
    console.log('generated plot image data:');
    //var fileStream = fs.createWriteStream('test.png');
    //imageStream.pipe(fileStream);
    //fileStream.on('error', reject);
    //fileStream.on('finish', resolve);
  });
}

function sortNumber(a, b) {
  return a - b;
}


module.exports = {
  actions: actions
}
