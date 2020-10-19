const config = require('./config.js');
const moment = require('moment');
var actions = {}

actions.test = function(){
  console.log('called parent function from child');
}

actions.run = function(){
  console.log(var1);
  var1 = 'new_a';
  console.log(var1);
  child1.actions.f('test message');
  console.log(var1);
}

var child2 = require('./child2.js');

module.exports = {
  actions:actions,
  child2:child2,
  moment:moment
}

var child1 = require('./child1.js');

actions.run();
