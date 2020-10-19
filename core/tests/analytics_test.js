//Plotly Chart Studio API
//API - WGIhp2vCZ9C86KEkjEJf
//Username - miles_holt
//Streaming token - vbey2uqiwm

const username = 'miles_holt';
const apikey = 'WGIhp2vCZ9C86KEkjEJf';
const streamtoken = 'vbey2uqiwm';

var plotly = require('plotly')(username,apikey);

var data = {
  'x':[0,1,2],
  'y':[3,2,1],
  'type':'scatter',
  'mode':'lines+markers',
  marker: {
    color: "rgba(31, 119, 180, 0.96)"
  },
  line: {
    color:"rgba(31, 119, 180, 0.31)"
  },
  stream: {
    "token": streamtoken,
    "maxpoints": 100
  }
}

var options = {
  "filename": "streamSimpleSensor",
  "fileopt": "overwrite",
  "layout": {
      "title": "streaming mock sensor data"
  },
  "world_readable": true
}


plotly.plot(data, options, function (err, msg) {
  if (err) return console.log(err)
  console.log(msg);


    // var stream1 = plotly.stream(streamtoken, function (err, res) {
    //   console.log(err, res);
    //   clearInterval(loop); // once stream is closed, stop writing
    // });
    //
    // var i = 0;
    // var loop = setInterval(function () {
    //     var streamObject = JSON.stringify({ x : i, y : i });
    //     stream1.write(streamObject+'\n');
    //     i++;
    // }, 1000);

});
