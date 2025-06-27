var actions = {};

actions.calculateEMA = async function (prices, period) {
  let multiplier = 2 / (period + 1); // Multiplier for EMA calculation
        let emaArray = [];

         if (!Array.isArray(prices) || prices.length === 0) {
          throw new Error("Data must be a non-empty array.");
        }
        if (period <= 0 || period > prices.length) {
          throw new Error("Invalid period. It must be greater than 0 and less than or equal to the length of the data.");
        }

        // Seed the EMA with the first SMA (Simple Moving Average)
        let sma = prices.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
        for (let i = 0; i < period - 1; i++) {
            emaArray[i] = null; // Fill with nulls for indices where EMA is not valid
        }
        emaArray[period - 1] = sma; // Initialize the EMA array with the first SMA

        // Calculate EMA for the rest of the data points
        for (let i = period; i < prices.length; i++) {
            emaArray[i] = (prices[i] - emaArray[i - 1]) * multiplier + emaArray[i - 1];
        }

        return emaArray; // Return the complete EMA array
};

module.exports = {
  actions: actions,
};
