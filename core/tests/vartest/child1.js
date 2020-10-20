
var actions = {};
var core = require.main.exports;
var cf = core.child2.actions.f;
//var child2 = core.child2;
var moment = core.moment;

actions.f = function (msg = 'test'){
  console.log(msg);
  console.log('called child1 function');
  console.log(moment('2016-01-01').format('YYYY'));
  console.log(var1);
  console.log(var2);
  var1 = 'new2_a';
  core.actions.test();
  let childvar = 'new variable created in child1';
  //child2.actions.f();
  cf();
}

module.exports = {
  actions:actions
}
