
var actions = {};
var moment;
var cf;
var core;
var child2;


actions.require = function(){
  core = require.main.exports;
  child2 = core.child2.actions;
  moment = core.moment;
}

actions.f = function (msg = 'test'){
  console.log(msg);
  console.log('called child1 function');
  console.log(moment('2016-01-01').format('YYYY'));
  console.log(var1);
  console.log(var2);
  var1 = 'new2_a';
  core.actions.test();
  child2.f();
}

module.exports = {
  actions:actions
}
