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
  bumpgroupcount = 0;
  //this makes sure that the bumps are together as a group (not scattered indexes), and must exceed a certain amount
  rangeData.bumps.forEach(bump => {
    if(bump.idx == (bidx+1)) bumpgroupcount++;
    bidx = bump.idx;
  });
}

/*

DETERMINE HIGHEST BUMP VOLATILITY

*/


actions.determineBumpVolatility = async function(){

  /*
    Loop through bump groups
    for each group, get the difference between highest and lowest points
    We then get a percentage of the price difference, which becomes the threshold
    If the bump difference is greater than this threshold, then bump volatility is true
  */

  /* Step 1: Create bump groups */
  let bumpGroups = [];
  let group = [];
  let bidx = 0;

  // rangeData.bumps.forEach(bump => {
  //   if(bump.idx == (bidx+1)){
  //     group.push(bump);
  //   }else {
  //     //new group
  //     bumpGroups.push(group);
  //     group = [];
  //     group.push(bump);
  //   }
  //   bidx = bump.idx;
  // });


  // rangeData.bumps.forEach((bump,idx) => {
  //   if((idx+1) < rangeData.bumps.length-1){
  //       let next = rangeData.bumps[idx+1];
  //       if(next.idx == bump.idx+1){
  //         group.push(bump)
  //       }else{
  //         bumpGroups.push(group);
  //         group = [];
  //       }
  //   }
  //
  //
  // });

  rangeData.bumps.forEach((bump,idx)=>{
     if((idx-1) >= 0){
       let prev = rangeData.bumps[idx-1];
       if(prev.idx == bump.idx-1){
         group.push(bump);
       }else{
         bumpGroups.push(group);
         group = [];
         group.push(bump);
       }
   } else {
       group.push(bump);
   }

   if(idx == rangeData.bumps.length-1){
     bumpGroups.push(group);
   }
});


  /* Step2: Determine volatility for each group */

  let bumpVolatilities = [];
  let bumpVolatilityIndexes = [];
  let lowest = 0;
  let highest = 0;

  if(bumpGroups.length > 0){
    bumpGroups.forEach((group, i) => {
      closes = [];
      group.forEach((bump,i) => {
        closes.push(bump.close);
      });
      closes.sort(lib.sortNumber);
      lowest = closes[0];
      highest = closes[closes.length-1];
      let bumpVolatilityIndex = group[group.length-1].idx;
      let bumpVolatility = highest - lowest;
      bumpVolatilities.push(bumpVolatility);
      bumpVolatilityIndexes.push(bumpVolatilityIndex);
    });

    //choose the bump group with the highest volatility difference
    bumpVolatilities.sort(lib.sortNumber);
    bumpVolatilityIndexes.sort(lib.sortNumber);
    bumpVolatilityDiff = bumpVolatilities[bumpVolatilities.length -1];
    bumpVolatilityIndex = bumpVolatilityIndexes[bumpVolatilityIndexes.length -1];

    /* Step3: get percentage of highest bump volatility difference */

    bumpVolatilityPerc = lib.toNumber(bumpVolatilityDiff / priceDiff);
  }

}

module.exports = {
  actions: actions
}
