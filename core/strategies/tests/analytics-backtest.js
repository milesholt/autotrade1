//Plotly Chart Studio API
//API - WGIhp2vCZ9C86KEkjEJf
//Username - miles_holt
//Streaming token - vbey2uqiwm

//const moment=require('moment');

const username = 'miles_holt';
const apikey = 'WGIhp2vCZ9C86KEkjEJf';
const streamtoken = 'vbey2uqiwm';
var plotly = require('plotly')(username,apikey);
var actions = {};
//moment().format();

actions.drawChart = function(pricedata, strategydata, tradeactivity){

  let times = [], closes = [], opens = [], highs = [], lows = [], range = [];
  var shapes = [];
  var annotations = [];

  // prices.forEach(price =>{
  //   times.push(price.snapshotTime.replace(/\//g, '-'));
  //   closes.push(price.closePrice.ask);
  //   opens.push(price.openPrice.ask);
  //   highs.push(price.highPrice.ask);
  //   lows.push(price.lowPrice.ask);
  //   range.push(price.lowPrice.ask);
  //   range.push(price.highPrice.ask);
  // });

  //Price bars

  pricedata.forEach(price =>{
    times.push(price.time);
    closes.push(price.close);
    opens.push(price.open);
    highs.push(price.high);
    lows.push(price.low);
    range.push(price.low);
    range.push(price.high);
  });

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
      line: {color: 'rgba(31,119,180,1)'},
      low: lows,
      open: opens,
      type: 'candlestick',
      xaxis: 'x',
      yaxis: 'y'
  };
  var data = [trace1];

  //Support and resistance lines

  strategydata.forEach(data =>{
    let linedata = data.linedata;
    let wickdata = data.wickdata;

    console.log(wickdata);

    let supportline = {
        type: 'line',
        y0: linedata.support,
        y1: linedata.support,
        x0: data.firstTime,
        x1: data.lastTime,
        line: {
          color: '#1DC7C9',
          width: 4,
          dash: 'solid'
        },
        xref: 'x',
        yref: 'y',
        opacity: 0.3,
        layer: 'above'
      }

    let resistanceline = {
          type: 'line',
          y0: linedata.resistance,
          y1: linedata.resistance,
          x0: data.firstTime,
          x1: data.lastTime,
          line: {
            color: '#D90E57',
            width: 4,
            dash: 'solid'
          },
          xref: 'x',
          yref: 'y',
          opacity: 0.3,
          layer: 'above'
    }

    shapes.push(supportline);
    shapes.push(resistanceline);

  });


  //Trade activity


  tradeactivity.forEach(activity => {
    let trade = {
        x: activity.time,
        y: activity.tradePrice,
        xref: 'x',
        yref: 'y',
        text: activity.action,
        showarrow: true,
        arrowhead: 6,
        ax: 0,
        ay: 10
    }

    //set the trade activity range from the 3 bars before trade price bar
    let endidx = 0;
    times.forEach((time, idx) => {
      if(time == activity.time) endidx = idx;
    });
    startidx = (endidx-4);

    let starttrade = times[startidx];
    let endtrade = activity.time;

    let stop = createLine(starttrade, endtrade, activity.stop, 'red', 'dash', 2);
    let limit = createLine(starttrade, endtrade, activity.limit, 'green', 'dash', 2);
    let tradeprice = createLine(starttrade, endtrade, activity.tradePrice, 'grey', 'dash', 2);

    shapes.push(stop,limit,tradeprice);
    annotations.push(trade);
  });



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
    shapes: shapes,
    annotations: annotations
  };

  var options = {
    "filename": "analyticsBacktest",
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

function createLine(x0, x1, y, color = 'red', dash = 'solid', width = 4){
  return {
    type: 'line',
    y0: y,
    y1: y,
    x0: x0,
    x1: x1,
    line: {
      color: color,
      width: 4,
      dash: dash
    },
    xref: 'x',
    yref: 'y',
    opacity: 0.3,
    layer: 'above'
  }
}


module.exports = {
  actions: actions
}
