
//STELLAR

// const rangelimit = 0.25;
// const tradelimit = 0.4;
// const linedistancelimit =  0.05;
// const stopDistanceFluctuation = 0.1;


//BITCOIN

//const rangelimit = 100;
//const tradelimit = 120;
//const linedistancelimit =  20;
//const stopDistanceFluctuation = 10;


const close = 10.00; //stellar
//const close = 10000; //bitcoin


const value = close;

//PERCENTAGE PARAMETERS - STELLAR
rangelimitperc = 3;
tradelimitperc = 5;
linedistancelimitperc = 0.6;
stopdistancefluctuationperc = 1.2;




//PERCENTAGE PARAMETERS - BITCOIN
// rangelimitperc = 0.9;
// tradelimitperc = 5;
// linedistancelimitperc = 0.6;
// stopdistancefluctuationperc = 1.2;


// const rangelimit = toNumber(value/100*rangelimitperc);
// const tradelimit = toNumber(value/100*tradelimitperc);
// const linedistancelimit = toNumber(value/100*linedistancelimitperc);
// const stopDistanceFluctuation = toNumber(value/100*stopdistancefluctuationperc);

const rangelimit = toNumber(value*(rangelimitperc/100));
const tradelimit = toNumber(value*(tradelimitperc/100));
const linedistancelimit = toNumber(value*(linedistancelimitperc/100));
const stopDistanceFluctuation = toNumber(value*(stopdistancefluctuationperc/100));

function toNumber(v){
  return Math.abs(parseFloat(v.toFixed(2)));
}

console.log(rangelimit);
console.log(tradelimit);
console.log(linedistancelimit);
console.log(stopDistanceFluctuation);


/*

Possible resolution

If bitcoin is 10000, and stellar is 10.00

rangelimit for stellar = 0.25 > (* 100 * 4) = 100 <  rangelimit for bitcoin
tradelimit for stellar = 0.4 > (* 100 * 4) = 160 <  almost rangelimit for bitcoin
linedistance for stellar = 0.05 > (* 100 * 4) = 20 < linedistance for bitcoin
stopdistanceflux for stellar = 0.1 > (*100) = 10 < stopdistanceflux for bitcoin

for every deciminal point, that becomes the multiplier but also multipled by a fixed variable (4)

so if the close value is double digits behind zero, we multiply by 100


*/
