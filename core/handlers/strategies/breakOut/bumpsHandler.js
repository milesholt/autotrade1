var actions = {};
var core;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
}

/*

DETERMINE BUMPS

*/

actions.determineBumps = async function(){
  //this checks that if some price bars are ignored within the range area, and they are greater or smaller than the beforerangefirstclose, then
  //this suggests a bump / hill formation within the range area and not a staircase formation
  let rd = rangeData.support.prices_idx;
  rangeData.bumps = [];
  pricedata2.support.forEach((price,idx) => {
    if((price.close >= resistanceline || price.close <= supportline) && rd.indexOf(idx) === -1 && (idx >= rd[0] && idx <= rd[rd.length-1])) rangeData.bumps.push({ 'idx' : idx, 'close' : price.close });
  });
  let bidx = 0;
  let bumpgroupcount = 0;
  //this makes sure that the bumps are together as a group (not scattered indexes), and must exceed a certain amount
  rangeData.bumps.forEach(bump => {
    if(bump.idx == (bidx+1)) bumpgroupcount++;
    bidx = bump.idx;
  });
}

module.exports = {
  actions: actions
}
