var actions = {};

actions.calculateAverageVolume = async function(data, period) {
  if (data.length < period) {
    throw new Error("Not enough data to calculate the average volume for the specified period.");
  }

  const recentData = data.slice(data.length - period);
  const totalVolume = recentData.reduce((sum, item) => sum + item.volume, 0);
  return totalVolume / period;
};

module.exports = {
  actions:actions
}
