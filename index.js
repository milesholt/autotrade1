//PARAMS

// IG_API_KEY=e47644533fa136f5f93a7abd40953d3c28ed9c67
// IG_IDENTIFIER=milesholt
// IG_PASSWORD=Savelli_1986
// IG_DEMO=TRUE

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
