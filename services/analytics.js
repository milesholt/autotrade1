//Plotly Chart Studio API
//API - WGIhp2vCZ9C86KEkjEJf
//Username - miles_holt
//Streaming token - vbey2uqiwm

const username = 'miles_holt';
const apikey = 'WGIhp2vCZ9C86KEkjEJf';
const streamtoken = 'vbey2uqiwm';
var plotly = require('plotly')(username,apikey);
var actions = {};
const moment=require('moment');
moment().format();

actions.drawChart = async function(pricedata, wickdata, linedata, analysis, rangedata){

  let times = [], customdata = [], shapes = [], closes = [], opens = [], highs = [], lows = [], range = [];

  // prices.forEach(price =>{
  //   times.push(price.snapshotTime.replace(/\//g, '-'));
  //   closes.push(price.closePrice.ask);
  //   opens.push(price.openPrice.ask);
  //   highs.push(price.highPrice.ask);
  //   lows.push(price.lowPrice.ask);
  //   range.push(price.lowPrice.ask);
  //   range.push(price.highPrice.ask);
  // });

  pricedata.forEach((price, i) =>{
    times.push(price.time);
    closes.push(price.close);
    opens.push(price.open);
    highs.push(price.high);
    lows.push(price.low);
    range.push(price.low);
    range.push(price.high);
    customdata.push({});

    rangedata.support.prices_idx.forEach((pidx,ridx) => {
      //console.log(pidx);
      //console.log(rangedata.support.prices[ridx]);
      if(pidx == i){
        let j = i+1;
        let circle = {
          type: 'circle',
          xref: 'x',
          yref: 'y',
          fillcolor: 'rgba(217, 14, 87, 0.7)',
          line: {
            width: 0,
            dash:'solid'
          },
          x0: moment(price.time).subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
          y0: rangedata.support.prices[ridx]-10,
          x1: moment(price.time).add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
          y1: rangedata.support.prices[ridx]+10
        }
        shapes.push(circle);
      }
    });


    // confirmations.support_index.forEach(sidx => {
    //   if(sidx == i){
    //     let j = i+1;
    //     let circle = {
    //       type: 'circle',
    //       xref: 'x',
    //       yref: 'y',
    //       fillcolor: 'rgba(217, 14, 87, 0.7)',
    //       line: {
    //         width: 0,
    //         dash:'solid'
    //       },
    //       x0: price.time,
    //       y0: price.price,
    //       x1: moment(price.time).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    //       y1: price.price+10
    //     }
    //     shapes.push(circle);
    //   }
    // });
    //
    // confirmations.resistance_index.forEach(ridx => {
    //   if(ridx == i){
    //     console.log(ridx);
    //     let j = i+1;
    //     let circle = {
    //       type: 'circle',
    //       xref: 'x',
    //       yref: 'y',
    //       fillcolor: 'rgba(29, 199, 201, 0.7)',
    //       line: {
    //         width: 0,
    //         dash:'solid'
    //       },
    //       x0: price.time,
    //       y0: price.price,
    //       x1: moment(price.time).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    //       y1: price.price+10
    //     }
    //     shapes.push(circle);
    //   }
    // });

    //console.log(shapes);

  });

  customdata[customdata.length-1] = analysis;

  range.sort(sortNumber);

  let lowest = range[0];
  let highest = range[range.length-1];
  let starttime =  times[0];
  let endtime = times[times.length-1]

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
      yaxis: 'y',
      customdata: customdata
  };

  var supportline = {
      type: 'line',
      y0: linedata.support,
      y1: linedata.support,
      x0: starttime,
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
        y0: linedata.resistance,
        y1: linedata.resistance,
        x0: starttime,
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
        y0: linedata.midrange,
        y1: linedata.midrange,
        x0: starttime,
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

  var data = [trace1];

  shapes.push(supportline, resistanceline, midrangeline);

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
      title: 'Date',
      type: 'date'
    },
    yaxis: {
      autorange: true,
      domain: [0, 1],
      range:[lowest,highest],
      type: 'linear'
    },
    shapes:shapes
  };

  var options = {
    "filename": "streamSimpleSensor",
    "fileopt": "overwrite",
    layout,
    "world_readable": true
  }

  plotly.plot(data, options, function (err, msg) {
    if (err) return console.log(err)
    console.log(msg);
  });
}

function sortNumber(a, b) {
  return a - b;
}


module.exports = {
  actions: actions
}
