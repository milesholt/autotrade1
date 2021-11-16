var actions = {};
var core;
var moment;
var api;

/*

REQUIRE

*/

actions.require = function(){
  core = require.main.exports;
  moment = core.moment;
  api = core.api;
}

/*

LOOP
Main loop function

*/

actions.loop = async function(msg = ''){
  console.log(msg);
  let timestamp  = moment().format('LLL');
  console.log('Time is:' + timestamp);


  //check loop isn't already running
  // if(!!isLoopRunning){
  //   isLoopRunning = true;

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
      console.log('waiting...');
      setTimeout(actions.loopMarkets,(60*(60-min)+(70-sec))*1000);
    }
  //}

}

/*

LOOP THROUGH MARKETS
Loop through and prepare epics before running exec()

*/

actions.loopMarkets = async function(){
  //First make sure loop isn't already running
  if(isLoopRunning) return false;
  isLoopRunning = true;

  //Loop through each market and prepare variables
  //markets.forEach(async (m,i) => {
  for (const [i, m] of markets.entries()) {
    mid = i;
    market = markets[mid];
    epic = m.epic;

    //get latest dealing rules
    await api.epicDetails([epic]).then(r => {
      let stopDistance = r.marketDetails[0].dealingRules.minNormalStopOrLimitDistance;
      market.minimumStop.value = stopDistance.value;
      market.minimumStop.type = String(stopDistance.unit).toLowerCase();
    }).catch(e => console.log(e));


    //dealId = m.dealId;
    console.log('looping markets: ' + epic);

    try {
      await core.actions.exec();
    } catch(e) {
      console.log(e);
    }

  }

  //another method
  //https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
  // await Promise.all(files.map(async (file) => {
  //   const contents = await fs.readFile(file, 'utf8')
  //   console.log(contents)
  // }));

}





/*

RESET lOOP
Method for resetting a loop, used for error handling

*/

actions.resetLoop = async function(msg = ''){
  actions.loop(msg);
  noError = true;
  return false;
}

module.exports = {
  actions: actions
}
