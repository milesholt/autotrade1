//Plotly Chart Studio API
//API - WGIhp2vCZ9C86KEkjEJf
//Username - miles_holt
//Streaming token - vbey2uqiwm

// const username = 'miles_holt';
// const apikey = 'WGIhp2vCZ9C86KEkjEJf';
// const streamtoken = 'vbey2uqiwm';
// var plotly = require('plotly')(username,apikey);

const username = 'miles_holt';
const apikey = 'WGIhp2vCZ9C86KEkjEJf';
const streamtoken = 'vbey2uqiwm';
const userdetails = {
  username : username,
  apiKey : apikey,
  host: 'chart-studio.plotly.com'
};
var plotly = require('plotly')(userdetails,apikey);
var actions = {};
const moment=require('moment');
moment().format();

actions.drawChart = async function(pricedata, wickdata, linedata, analysis, rangedata){

  let times = [], customdata = [], shapes = [], closes = [], opens = [], highs = [], lows = [], range = [];

  pricedata.forEach(price =>{
    times.push(price.time);
    closes.push(price.close);
    opens.push(price.open);
    highs.push(price.high);
    lows.push(price.low);
    customdata.push({});
    range.push(price.low);
    range.push(price.high);
  });

  range.sort(sortNumber);

  const lowestnum = range[0];
  const highestnum = range[range.length-1];
  const pricediff = highestnum - lowestnum;
  const circleheight = pricediff * 0.015; //get fraction of height, so it's in proportion to data range

  //console.log(rangedata);

  //skip first 12 hours
  let pricedata2 = pricedata.slice(12, pricedata.length);
  let midprices = pricedata2.map(r => (parseInt((r.open+r.close)/2).toFixed(2)));

  pricedata2.forEach((price, i) =>{

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
          y0: rangedata.support.prices[ridx]-circleheight,
          x1: moment(price.time).add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
          y1: rangedata.support.prices[ridx]+circleheight
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

  // momentumLimit = 0.25;
  // rangelimit = 0.25;
  // tradelimit = 0.4;
  // linedistancelimit =  0.05;

  const momentLimitPerc = 0.1;  //same as range limit
  const tradeLimitPerc = 0.15;
  const lineDistanceLimitPerc = 0.05;

  //let lastClose =  parseFloat(closes[closes.length-1]);
  let lastRangeIndex = rangedata.support.prices_idx[rangedata.support.prices_idx.length-1];
  //console.log(lastRangeIndex);
  let lastData = pricedata2[lastRangeIndex];

  let lastTime = lastData.time;
  let lastTimeStart = moment(lastTime).subtract(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  let lastTimeEnd = moment(lastTime).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');

  //console.log(lastTime);
  let lastClose = parseFloat(lastData.close);

  let momentumLimit = parseFloat(pricediff * momentLimitPerc).toFixed(2);
  let momentumBuyLimit = parseFloat(lastClose + parseFloat(momentumLimit)).toFixed(2);
  let momentumSellLimit = parseFloat(lastClose - parseFloat(momentumLimit)).toFixed(2);

  let tradeLimit = parseFloat(pricediff * tradeLimitPerc).toFixed(2);
  let tradeBuyLimit = parseFloat(lastClose + parseFloat(tradeLimit)).toFixed(2);
  let tradeSellLimit = parseFloat(lastClose - parseFloat(tradeLimit)).toFixed(2);

  let lineDistanceLimit = parseFloat(pricediff * lineDistanceLimitPerc).toFixed(2);
  let lineDistanceLimit0 = parseFloat(linedata.midrange + parseFloat(lineDistanceLimit/2)).toFixed(2);
  let lineDistanceLimit1 = parseFloat(linedata.midrange - parseFloat(lineDistanceLimit/2)).toFixed(2);

  //console.log('momentumLimit: ' + momentumLimit);
  //console.log('tradeLimit: ' + tradeLimit);
  //console.log('lowest (analytics):  ' + lowestnum);
  //console.log('highest (analytics):  ' + highestnum);

  //console.log('lastClose: ' + lastClose);
  //console.log('momentumBuyLimit: ' + momentumBuyLimit);
  //console.log('momentumSellLimit: ' + momentumSellLimit);

//  console.log('tradeBuyLimit: ' + tradeBuyLimit);
  //console.log('tradeSellLimit: ' + tradeSellLimit);

  //console.log('lineDistanceLimit: ' + lineDistanceLimit);

  customdata[customdata.length-1] = analysis;



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

  var momentumarea = {
        type: 'rect',
        y0: momentumBuyLimit,
        y1: momentumSellLimit,
        x0: lastTimeStart,
        x1: lastTimeEnd,
        line: {
          color: '#530EE0', //dark purple
          width: 0,
          dash: 'solid'
        },
        fillcolor: '#48c27a',
        xref: 'x',
        yref: 'y',
        opacity: 0.15,
        layer: 'above'
  }

  var tradearea = {
        type: 'rect',
        y0: tradeBuyLimit,
        y1: tradeSellLimit,
        x0: lastTimeStart,
        x1: lastTimeEnd,
        line: {
          color: '#48c27a', //green
          width: 0,
          dash: 'solid'
        },
        fillcolor: '#48c27a',
        xref: 'x',
        yref: 'y',
        opacity: 0.17,
        layer: 'above'
  }

  var minimumarea = {
        type: 'rect',
        y0: lineDistanceLimit0,
        y1: lineDistanceLimit1,
        x0: starttime,
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

  var data = [trace1];

  shapes.push(supportline, resistanceline, midrangeline, momentumarea, tradearea, minimumarea);

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
      range:[lowest,highest],
      type: 'linear'
    },
    shapes:shapes
  };

  var options = {
    "filename": "analyticsTest",
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
