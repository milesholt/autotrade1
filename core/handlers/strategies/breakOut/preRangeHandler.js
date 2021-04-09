var actions = {};
var core;
var lib;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  lib = core.lib.actions;
}

/*

NOT IN USE CURRENTLY

DETERMINE PRE RANGE TREND

This determines how many price bars define the trend pattern before range area begins
If there is enough data here to emphasise a strong trend before range, then this should be a good data to go by and open a trade

*/

actions.determinePreRangeTrend = async function(){

var rD = rangeData.support.prices_idx;
var pD =  pricedata.support[i];
const firstRangeIdx = rD[0];



}
