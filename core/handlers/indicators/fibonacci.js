var actions = {};

actions.getFibonacciLevels = async function (data) {
    if (!Array.isArray(data) || data.length < 24) {
        throw new Error("Insufficient data. At least 24 hourly entries required.");
    }

    // Step 1: Get the last 24 data points (most recent day)
    const recentData = data.slice(-24);

    // Step 2: Calculate High, Low, and Close
    const high = Math.max(...recentData.map(entry => entry.high));
    const low = Math.min(...recentData.map(entry => entry.low));
    const close = recentData[recentData.length - 1].close;

    // Step 3: Calculate Pivot Point
    // The pivot point, or average point, is the median price level for that day.
    // This means the average of the highest price, lowest price, and the most significant (recent) close price over a 24 hour period.
    const PP = (high + low + close) / 3;

    // Step 4: Calculate Fibonacci-based Support and Resistance levels
    const range = high - low;

    const supportLevels = {
        S1: PP - (range * 0.382),
        S2: PP - (range * 0.618),
        S3: PP - (range * 1.0)
    };

    const resistanceLevels = {
        R1: PP + (range * 0.382),
        R2: PP + (range * 0.618),
        R3: PP + (range * 1.0)
    };

    // Step 5: Fibonacci Retracement Levels
    const levels = {
        level0: low,
        level236: low + 0.236 * range,
        level382: low + 0.382 * range,
        level50: low + 0.5 * range,
        level618: low + 0.618 * range,
        level786: low + 0.786 * range,
        level100: high
    };

    // Step 6: Return results
    return {
        high,
        low,
        close,
        pivotPoint: PP,
        supportLevels,
        resistanceLevels,
        levels
    };
};

module.exports = {
  actions: actions,
};
