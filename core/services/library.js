var actions = {};
const util=require('util');
const moment=require('moment');
const fs = require('fs');
const path = require('path');
moment().format();

/* Convert value to number */

//This will convert a string to a number rounded to decimal points, default is 2
//Also has the option of getting the absolute value (non negative)
actions.toNumber = function(val,method=false,points=2){
  let r = parseFloat(val.toFixed(points));
  switch(method){
    case 'abs':
     r = parseFloat(Math.abs(val).toFixed(points));
    break;
  }
  return r;
}

actions.toString = function(val){
  if(action.isJSON(val)) return JSON.stringify(val);
  return val.toString();
}

actions.isEmpty = function(obj){
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

actions.isDefined(obj,prop){
  return obj.hasOwnProperty(prop);
}

actions.sortNumber = function(a, b) {
  return a - b;
}

actions.isJSON = function(val){
  try {
       JSON.parse(str);
   } catch (e) {
       return false;
   }
   return true;
}

actions.deepCopy = function(origObj){
        var newObj = origObj;
         if (origObj && typeof origObj === "object") {
             newObj = Object.prototype.toString.call(origObj) === "[object Array]" ? [] : {};
             for (var i in origObj) {
                 newObj[i] = this.deepCopy(origObj[i]);
             }
         }
         return newObj;
}




module.exports = {
  actions: actions
}
