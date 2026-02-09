/**
 * Convert timeframe string to milliseconds
 */
export function timeframeToMs(timeframe: string): number {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown timeframe unit: ${unit}`);
  }
}

/**
 * Binance klines interval mapping
 */
export const BINANCE_INTERVALS = {
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "12h": "12h",
  "1d": "1d",
  "3d": "3d",
  "1w": "1w",
  "1M": "1M",
} as const;

/**
 * Get HTF (higher timeframe) for HTF analysis
 * Usually 4h for scalping
 */
export function getHTFInterval(): "4h" {
  return "4h";
}

/**
 * Get LTF (lower timeframe) for entry confirmation
 * Usually 15m for scalping
 */
export function getLTFInterval(): "15m" {
  return "15m";
}

/**
 * Get number of candles needed for analysis
 */
export function getCandleCount(timeframe: string, daysBack: number = 7): number {
  const msPerCandle = timeframeToMs(timeframe);
  const msTotal = daysBack * 24 * 60 * 60 * 1000;
  return Math.ceil(msTotal / msPerCandle) + 50; // Add buffer
}

/**
 * Format timeframe for display
 */
export function formatTimeframe(timeframe: string): string {
  const unit = timeframe.slice(-1);
  const value = timeframe.slice(0, -1);

  const unitNames: Record<string, string> = {
    m: "minute",
    h: "hour",
    d: "day",
    w: "week",
    M: "month",
  };

  return `${value}${unitNames[unit] || unit}${parseInt(value) > 1 ? "s" : ""}`;
}
