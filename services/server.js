
// CONFIG

var actions = {};
const ig = require ('./ig.js');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

/* Initiate */

actions.ini = function(){
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}) );
    app.all("/*", function(req, res, next){
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
      next();
    });
    app.get('/', (req, res) => res.send('IG Server'))
    app.listen(3000, function () {
      console.log('IG Server is working on Port 3000')
    });
}

/* Requests */

actions.request = function(data){
  var action;
  switch(data.actions){
    case 'login':
      action = actions.login(data);
    break;
  }
  return action;
}

/* Actions */

actions.login = function(data){
  return new Promise((resolve, reject) => {
      ig.actions.login().then((r) => { resolve(r);
      },(e) => { error(e);
      });
  });
}

/* Errors */

function error(e){
  console.log(e);
}

module.exports = {
  actions: actions,
  app: app
}
