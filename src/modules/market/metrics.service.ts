import {
  calculateATR,
  calculate24hRange,
  calculateSMA,
  isTrendingUp,
  isTrendingDown,
} from "@/utils/math";
import { Candle } from "./binance.client";
import { createLogger } from "@/utils/logger";

const log = createLogger("MetricsService");

export interface MarketMetrics {
  atrPercent: number;
  range24h: number;
  trendRegime: "uptrend" | "downtrend" | "sideways";
  volatilityRegime: "low" | "normal" | "high";
  currentPrice: number;
  sma20: number | null;
  sma50: number | null;
}

/**
 * Calculate ATR percentage from candles
 */
export function calculateATRPercent(candles: Candle[]): number {
  if (candles.length < 14) return 0;

  const parsed = candles.map((c) => ({
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  return calculateATR(parsed, 14);
}

/**
 * Calculate 24h range as percentage
 */
export function calculate24hRangePercent(candles: Candle[]): number {
  if (candles.length === 0) return 0;

  const currentPrice = candles[candles.length - 1].close;
  const parsed = candles.map((c) => ({
    high: c.high,
    low: c.low,
  }));

  return calculate24hRange(parsed, currentPrice);
}

/**
 * Detect trend regime
 */
export function detectTrendRegime(
  candles: Candle[]
): "uptrend" | "downtrend" | "sideways" {
  if (candles.length < 3) return "sideways";

  const closes = candles.map((c) => c.close);

  // Check recent price action (last 5 candles)
  const recent = closes.slice(-5);
  const high = Math.max(...recent);
  const low = Math.min(...recent);

  const trending_up = isTrendingUp(closes);
  const trending_down = isTrendingDown(closes);

  if (trending_up) return "uptrend";
  if (trending_down) return "downtrend";
  return "sideways";
}

/**
 * Detect volatility regime
 */
export function detectVolatilityRegime(atrPercent: number): "low" | "normal" | "high" {
  // Thresholds can be adjusted based on market conditions
  if (atrPercent < 1) return "low";
  if (atrPercent < 3) return "normal";
  return "high";
}

/**
 * Calculate all metrics at once
 */
export function calculateMetrics(candles: Candle[]): MarketMetrics {
  if (candles.length === 0) {
    throw new Error("No candles provided");
  }

  const currentPrice = candles[candles.length - 1].close;
  const closes = candles.map((c) => c.close);

  const atrPercent = calculateATRPercent(candles);
  const range24h = calculate24hRangePercent(candles);
  const trendRegime = detectTrendRegime(candles);
  const volatilityRegime = detectVolatilityRegime(atrPercent);

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  const metrics: MarketMetrics = {
    atrPercent,
    range24h,
    trendRegime,
    volatilityRegime,
    currentPrice,
    sma20: sma20 || null,
    sma50: sma50 || null,
  };

  log.debug({ metrics }, "Calculated market metrics");
  return metrics;
}

/**
 * Check if market is suitable for trading
 */
export function isMarketTradeable(metrics: MarketMetrics): boolean {
  // Don't trade in low volatility
  if (metrics.volatilityRegime === "low") {
    return false;
  }

  // Don't trade if range is very low
  if (metrics.range24h < 0.5) {
    return false;
  }

  return true;
}
