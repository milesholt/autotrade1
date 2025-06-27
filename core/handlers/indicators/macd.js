var actions = {};

actions.calculateMACD = async function (data, fastPeriod, slowPeriod, signalPeriod) {
   
    // Ensure the input data is valid
    if (!data || data.length < slowPeriod) {
        throw new Error("Insufficient data for calculation"); // Handle cases where there isn't enough data
    }

    // Extract closing prices from the input data
    let closePrices = data.map(d => d.close); // Assuming the input is an array of objects with 'close' property

    // Calculate the fast EMA (shorter period)
    let emaFast = await actions.calculateEMA(closePrices, fastPeriod);

    // Calculate the slow EMA (longer period)
    let emaSlow = await actions.calculateEMA(closePrices, slowPeriod);

    // Calculate MACD Line (difference between fast EMA and slow EMA)
    let macdLine = emaFast.map((value, index) => {
        if (index >= slowPeriod - 1) {
            return value - emaSlow[index];
        }
        return null; // Return null for indices where MACD Line cannot be calculated
    });

    // Filter out null values from MACD Line for further calculations
    let validMacdLine = macdLine.filter(value => value !== null);

    // Calculate the Signal Line (EMA of the MACD Line)
    // Ensure Signal Line length matches MACD Line length
    let signalLineRaw = await actions.calculateEMA(validMacdLine, signalPeriod);
    let signalLine = macdLine.map((value, index) => {
        if (index >= slowPeriod - 1 && signalLineRaw[index - (slowPeriod - 1)] !== undefined) {
            return signalLineRaw[index - (slowPeriod - 1)];
        }
        return null;
    });
   
    // Calculate the MACD Histogram (difference between MACD Line and Signal Line)
    let histogram = validMacdLine.map((value, index) => {
        if (index < signalLine.length) {
            return value - signalLine[index]; // Subtract Signal Line from MACD Line
        }
        return null; // Return null for indices where Histogram cannot be calculated
    });

    // Align the results by trimming leading null values
    return {
        macdLine: macdLine,
        signalLine: signalLine.map((value, index) => index >= slowPeriod - 1 ? value : null),
        histogram: histogram
    };
};

module.exports = {
  actions: actions,
};

