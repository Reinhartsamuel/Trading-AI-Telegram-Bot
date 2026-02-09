/**
 * Calculate Average True Range (ATR) in percentage
 * ATR measures volatility, higher values = higher volatility
 */
export function calculateATR(
  candles: Array<{ high: number; low: number; close: number }>,
  period: number = 14
): number {
  if (candles.length < period) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const prevClose = i > 0 ? candles[i - 1].close : candle.close;

    const tr = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - prevClose),
      Math.abs(candle.low - prevClose)
    );

    trueRanges.push(tr);
  }

  // Calculate ATR using SMA
  const atrValues = trueRanges.slice(-period);
  const atr = atrValues.reduce((a, b) => a + b, 0) / period;

  // Return as percentage of current close
  const lastClose = candles[candles.length - 1].close;
  return (atr / lastClose) * 100;
}

/**
 * Calculate 24h range as percentage of current price
 */
export function calculate24hRange(
  candles: Array<{ high: number; low: number }>,
  currentPrice: number
): number {
  if (candles.length === 0) return 0;

  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const range = high - low;

  return (range / currentPrice) * 100;
}

/**
 * Calculate percentage change between two prices
 */
export function percentageChange(oldPrice: number, newPrice: number): number {
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Calculate risk/reward ratio
 */
export function calculateRiskReward(
  entry: number,
  stopLoss: number,
  takeProfit: number
): number {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);

  if (risk === 0) return 0;
  return reward / risk;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(
  values: number[],
  period: number
): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Detect if price is trending up
 */
export function isTrendingUp(closes: number[]): boolean {
  if (closes.length < 3) return false;
  const recent = closes.slice(-3);
  return recent[1] > recent[0] && recent[2] > recent[1];
}

/**
 * Detect if price is trending down
 */
export function isTrendingDown(closes: number[]): boolean {
  if (closes.length < 3) return false;
  const recent = closes.slice(-3);
  return recent[1] < recent[0] && recent[2] < recent[1];
}
