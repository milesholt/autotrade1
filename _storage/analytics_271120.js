//Plotly Chart Studio API
//API - WGIhp2vCZ9C86KEkjEJf
//Username - miles_holt
//Streaming token - vbey2uqiwm

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
var actions = {};
const moment=require('moment');
moment().format();

actions.drawChart = async function(priceData, lineData, analysis, rangeData){

  let times = [], customdata = [], shapes = [], closes = [], opens = [], highs = [], lows = [], range = [];

  priceData.forEach(price =>{
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
  const circleheight = parseFloat((pricediff * 0.013).toFixed(3)); //get fraction of height, so it's in proportion to data range
  console.log('circleheight: ' + circleheight);

  //skip first 12 hours
  let priceData2 = priceData.slice(12, priceData.length);
  let midprices = priceData2.map(r => (parseFloat((r.open+r.close)/2).toFixed(2)));
  
  console.log('SORTING RANGE DATA FOR ANALYTICS-------------------');

  priceData2.forEach((price, i) =>{
  //skip first 12 hours
//   if(i < 11){
//     continue;
//   }
    //for(let i = 11, len = priceData.length; i<len; i++){
      //let price = priceData[i];
      let range_col = 'rgba(217, 14, 87, 0.7)';
      let bump_col = 'rgba(92, 123, 207, 0.7)';

      let midprice = Math.abs(parseFloat(price.open+price.close)/2);
      let midplus = parseFloat(midprice+circleheight).toFixed(3);
      let midminus = parseFloat(midprice-circleheight).toFixed(3);
      midprice = parseFloat(midprice).toFixed(2); //round it after setting midplus and minus, otherwise numbers are incorrect
    
      //console.log('price open: ' + price.open + ' price close: ' + price.close + ' mid price: ' + midprice + ' midplus: ' + midplus + ' midminus: ' + midminus);

      rangeData.support.prices_idx.forEach((pidx,ridx) => {
        //console.log(pidx);

        //let y0 = parseFloat(rangeData.support.prices[ridx]-circleheight).toFixed(2);
        //let y1 = parseFloat(rangeData.support.prices[ridx]+circleheight).toFixed(2);

        //console.log('yo: ' + rangeData.support.prices[ridx]);
        //console.log('y1: ' + rangeData.support.prices[ridx]);
        //console.log('yo: ' + y0);
        //console.log('y1: ' + y1);

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
          shapes.push(circle);
        }
      });

      //console.log('openprice:' + price.open);
      //console.log('closeprice:' + price.close);
      //console.log('midprice:' + midprice);
      //console.log('midprice plus circleheight:' + midplus);
      //console.log('midprice minus circleheight:' + midminus);

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
  //}
  });

  customdata[customdata.length-1] = analysis;

  range.sort(sortNumber);

  let lowest = range[0];
  let highest = range[range.length-1];
  let starttime =  times[0];
  let starttime2 = times[11]; //12 hours ahead (range area needs to be 24 hours not 36)
  let endtime = times[times.length-1];


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
    if (err) return console.log(err);
    console.log(msg);
  });

  var chart = { 'data': [ data ], 'layout':layout };
  actions.getImage(chart);
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
