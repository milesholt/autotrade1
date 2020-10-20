var actions = {};
var core;
var moment;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  moment =  core.moment;
}

/*

DETERMINE MISSING HOURS

*/

actions.determineMissingHours = async function(){
  //loop through times and ensure no hours / data is missing (on Fridays for example, the market closes, there is a gap in hours which affects the data)
  let time = moment(pricedata2.support[0].time);
  isHoursCorrect = true;
  let totalMissingHours = 0;
  let start = 0, end = 0, diff = 0, d = 0;

  pricedata2.support.forEach((price,index) => {
    //skip the first hour
    if(index !== 0){
      // let ntime = moment(price.time);
      // let diff = Math.abs(time.diff(ntime, 'minutes'));
      // if(diff !== 60) totalMissingHours += diff / 60;
      // time = moment(price.time);

      start = time;
      end = moment(price.time);
      diff = end.diff(start, "hours") - 1; //remove by one because we only want the number of hours in between
      d = diff == -1 ? 0 : diff;
      totalMissingHours += diff;
      time = moment(price.time);
    }
  });
  //if the number of hours is greater than limit, set data as missing. Exceptions if for example, only one or two hours is missing, this is fine.
  if(totalMissingHours >= missingHoursLimit) isHoursCorrect = false;
}

module.exports = {
  actions: actions
}
