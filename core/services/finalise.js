
var actions = {};

actions.log = async function(epic, analysis){

  markets.forEach((market,i) => {
    if(market.epic == epic){
      market.trades.push(analysis);
    }
  })
}

module.exports = {
  actions:actions
}
