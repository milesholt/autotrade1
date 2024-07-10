const path = require('path');
const http = require('http');
const fs = require('fs');
const url = path.join(__dirname, 'pricedata.json');
const dest = "pricedata.json";
const file = fs.createWriteStream(dest);

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

var cb = function(){
  console.log('finished downloading');
}

download(url,dest,cd);
