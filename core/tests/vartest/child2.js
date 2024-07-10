
var actions = {};
var core;

actions.require = function(){
  core = require.main.exports;
  cf = core.child2.actions.f;
}

actions.f = function (){
  console.log('called child2 function');
}

module.exports = {
  actions:actions
}
