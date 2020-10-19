
var actions = {};
var core = require.main.exports;
var cf = core.child2.actions.f;

actions.f = function (msg = 'test'){
  console.log(msg);
  console.log('called child1 function');
  console.log(core.moment('2016-01-01').format('YYYY'));
  console.log(var1);
  console.log(var2);
  var1 = 'new2_a';
  core.actions.test();
  cf();
}

module.exports = {
  actions:actions
}
