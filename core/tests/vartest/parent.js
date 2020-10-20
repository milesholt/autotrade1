const config = require('./config.js');
const moment = require('moment');
var actions = {}

//require child modules

var child1 = require('./child1.js');
var child2 = require('./child2.js');

//core functions

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

//core export

module.exports = {
  actions:actions,
  child1:child1,
  child2:child2,
  moment:moment
}

//call child module requirements

child1.actions.require();
child2.actions.require();

//run

actions.run();
