var actions = {};
var core;
var api;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  api = core.api;
}

/*

HANDLE ERRORS
Main function for error handling

*/

actions.handleErrors = async function(e){
  console.log(e);
  if(e.body.errorCode){
    switch(e.body.errorCode){
      case 'error.security.client-token-invalid':
        await actions.handleInvalidSecurityToken(e);
      break;
      case 'error.invalid.daterange':
        await actions.handleInvalidDateRange(e);
      break;
      case 'customerror.price-data-empty':
        await actions.priceDataEmpty(e);
      break;
      case 'deal-rejected':
        await actions.handleDealRejected(e.body.error);
      break;
    }
  }
  //Once handled the error, we loop again
  var core = require.main.exports;
  var loop = core.loopHandler.actions;
  loop.resetLoop('Resetting loop after error handling');
}

/*

HANDLE INVALID SECURITY TOKEN
Method for handling API's invalid security token

*/

actions.handleInvalidSecurityToken = async function(e){
    console.log('Invalid security token. Clearing tokens and logging in again.');
    await api.logout(true).then(r => {
    }).catch(e => console.log(e));
    //Once logged out and tokens cleared, try again in 2 seconds
    setTimeout(async()=>{
      //log back in and go again..
      await core.actions.init();
      core.actions.exec();
    },2000);
    return false;
}


/*

HANDLE INVALID DATE RANGE

*/

actions.handleInvalidDateRange = async function(e){
  console.log('Handling invalid date range.');
  noError = false;
  finalMessage = 'Invalid date range, going again in an hour';
}

/*

HANDLE EMPTY PRICE DATA

*/

actions.priceDataEmpty = async function(e){
  console.log('Price data is empty.');
  noError = false;
  finalMessage = 'Price data is empty, possible error with IG server or incorrect epic used';
}

/* HANDLE DEAL REJECTED */

actions.handleDealRejected = async function(e){
  switch(e.reason){
    case 'ATTACHED_ORDER_LEVEL_ERROR':
        finalMessage = 'Deal error: the stopDistance or limitDistance is not accepted for this market';
    break;
  }
}

module.exports = {
  actions: actions
}
