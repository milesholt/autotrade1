
//CONFIG

const ig = require ('./services/ig.js');
const server = require ('./services/server.js');

/* Initiate Server */

server.actions.ini();

/* Handle Requests */

server.app.post('/requests', function (req, res) {
  server.actions.request(req.body).then((r) => {
    res.send(r);
  },(e) => { error(e);
  });
});

/* Handle Errors */

function error(e){
  console.log(e);
}
