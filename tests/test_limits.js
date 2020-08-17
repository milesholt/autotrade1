

//BITCOIN
//const highprice = 12400;
//const lowprice = 11800;

//const rangelimit = 100;
//const tradelimit = 120;
//const linedistancelimit =  20;
//const stopDistanceFluctuation = 10;

//STELLAR
const lowprice = 9.8;
const highprice = 10.8;

// const rangelimit = 0.35;
// const tradelimit = 0.4;
// const linedistancelimit =  0.05;
// const stopDistanceFluctuation = 0.1;

const pricediff = (highprice - lowprice);

//percentages of difference

//BITCOIN
rangelimitperc = 15;
tradelimitperc = 20;
linedistancelimitperc = 3;
stopdistancefluctuationperc = 1.5;

//STELLAR
// rangelimitperc = 35;
// tradelimitperc = 40;
// linedistancelimitperc = 5;
// stopdistancefluctuationperc = 10;

const rangelimit = toNumber(pricediff/100*rangelimitperc);
const tradelimit = toNumber(pricediff/100*tradelimitperc);
const linedistancelimit = toNumber(pricediff/100*linedistancelimitperc);
const stopDistanceFluctuation = toNumber(pricediff/100*stopdistancefluctuationperc);

function toNumber(v){
  return Math.abs(parseFloat(v.toFixed(2)));
}

console.log(rangelimit);
console.log(tradelimit);
console.log(linedistancelimit);
console.log(stopDistanceFluctuation);
