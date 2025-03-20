// src/utils/superTrend.js

import { ATR } from 'technicalindicators';

/**
 * Calculate the SuperTrend indicator.
 * @param {Array} candles - Array of candle objects (o: open, h: high, l: low, c: close).
 * @param {number} atrPeriod - ATR period.
 * @param {number} multiplier - Multiplier for ATR.
 * @returns {Array} SuperTrend values.
 */
export const calculateSuperTrend = (candles, atrPeriod, multiplier) => {
  // Extract high, low, and close prices
  const high = candles.map((candle) => candle.h);
  const low = candles.map((candle) => candle.l);
  const close = candles.map((candle) => candle.c);

  // Calculate ATR
  const atrValues = ATR.calculate({ high, low, close, period: atrPeriod });

  // Initialize SuperTrend values
  const superTrend = [];
  let prevUpperBand = 0;
  // let prevLowerBand = 0;
  let prevSuperTrend = 0;
  // atrPeriod = -atrPeriod;
  candles.forEach((candle, index) => {
    const atr = atrValues[index];
    const upperBand = ((candle.h + candle.l) / 2) + multiplier * atr;
    const lowerBand = ((candle.h + candle.l) / 2) - multiplier * atr;

    const superTrendValue = (prevSuperTrend === upperBand || close[index] > prevUpperBand)
      ? lowerBand
      : upperBand;

    superTrend.push(superTrendValue);
    prevUpperBand = upperBand;
    // prevLowerBand = lowerBand;
    prevSuperTrend = superTrendValue;
  });

  return superTrend;
};
