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

actions.drawChart = async function(){

  let shapes = [];
  let highs4 = [];
  let lows4 = [];
  let close4 = [];
  let open4 = [];
  let range4 = [];

  prices_4hour.forEach((price, i) =>{

    let midHigh = lib.toNumber(((price.highPrice.ask - price.highPrice.bid) / 2) + price.highPrice.bid);
    let midLow = lib.toNumber(((price.lowPrice.ask - price.lowPrice.bid) / 2) + price.lowPrice.bid);
    let midClose = lib.toNumber(((price.closePrice.ask - price.closePrice.bid) / 2) + price.closePrice.bid);
    let midOpen = lib.toNumber(((price.openPrice.ask - price.openPrice.bid) / 2) + price.openPrice.bid);

    highs4.push(midHigh);
    lows4.push(midLow);
    close4.push(midClose);
    open4.push(midOpen);

    range4.push(midLow);
    range4.push(midHigh);

  });

  range4.sort(lib.sortNumber);

  let lowest4 = range4[0];
  let highest4 = range4[range4.length-1];
  let starttime =  prices_4hour[0].snapshotTime.replace(/\//g, '-');
  let endtime = prices_4hour[ prices_4hour.length-1].snapshotTime.replace(/\//g, '-');

  var trace1 = {
      x: times,
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
  var data = traces;


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
      rangebreaks: [
        {
          enabled:true,
          bounds: ['sat', 'mon']
        }
      ],
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


function sortNumber(a, b) {
  return a - b;
}


module.exports = {
  actions: actions
}
