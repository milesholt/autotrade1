
var actions = {};
var core = require.main.exports;

actions.f = function (){
  console.log('called child2 function');
}

module.exports = {
  actions:actions
}
