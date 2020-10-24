var actions = {};
var core;
var moment;

/*

REQUIRE

*/

actions.require = function(){
  core = require.main.exports;
  moment = core.moment;
}

/*

LOOP
Main loop function

*/

actions.loop = async function(msg = ''){
  console.log(msg);
  let timestamp  = moment().format('LLL');
  console.log('Time is:' + timestamp);

  //executes at every full hour with additional offset
  //to collect data from the previous hour that's just past
  var d = new Date();
  var min = d.getMinutes();
  var sec = d.getSeconds();
  var offset = '10' //10 seconds offset
  if((min == '00') && (sec == offset)){
    let timestamp  = moment().format('LLL');
    await actions.loopMarkets();
  } else {
    setTimeout(actions.loopMarkets,(60*(60-min)+(70-sec))*1000);
  }

}

/*

LOOP THROUGH MARKETS
Loop through and prepare epics before running exec()

*/

actions.loopMarkets = async function(){
  //Loop through each market and prepare variables
  markets.forEach(async (m,i) => {
    mid = i;
    market = m;
    epic = m.epic;
    dealId = m.dealId;

    await core.actions.exec();
  });
}





/*

RESET lOOP
Method for resetting a loop, used for error handling

*/

actions.resetLoop = async function(msg = ''){
  actions.loop(msg);
  noError = false;
  return false;
}

module.exports = {
  actions: actions
}
