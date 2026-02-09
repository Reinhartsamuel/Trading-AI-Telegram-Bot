import { fetchKlinesWithRetry, Candle } from "./binance.client";
import { getRedis } from "@/db/redis";
import { getHTFInterval, getLTFInterval, getCandleCount } from "@/utils/timeframes";
import { createLogger } from "@/utils/logger";

const log = createLogger("OHLCVService");
const CACHE_TTL = 300; // 5 minutes

/**
 * Fetch HTF (4h) candles for analysis
 */
export async function getHTFData(pair: string): Promise<Candle[]> {
  const interval = getHTFInterval();
  return fetchOHLCVWithCache(pair, interval);
}

/**
 * Fetch LTF (15m) candles for entry confirmation
 */
export async function getLTFData(pair: string): Promise<Candle[]> {
  const interval = getLTFInterval();
  return fetchOHLCVWithCache(pair, interval);
}

/**
 * Fetch OHLCV data with Redis caching
 */
async function fetchOHLCVWithCache(
  pair: string,
  interval: string
): Promise<Candle[]> {
  const redis = getRedis();
  const cacheKey = `ohlcv:${pair}:${interval}`;

  try {
    // Try cache first
    const cached = await redis.getex(cacheKey, "EX", CACHE_TTL);
    if (cached) {
      log.debug({ pair, interval }, "Cache hit for OHLCV data");
      return JSON.parse(cached);
    }

    // Fetch fresh data
    const candleCount = getCandleCount(interval, 7);
    const candles = await fetchKlinesWithRetry(pair, interval, candleCount);

    // Cache it
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(candles));

    log.debug(
      { pair, interval, count: candles.length },
      "Fetched and cached OHLCV data"
    );
    return candles;
  } catch (error) {
    log.error({ pair, interval, error }, "Failed to fetch OHLCV data");
    throw error;
  }
}

/**
 * Get both HTF and LTF data
 */
export async function getMarketData(pair: string) {
  const [htfData, ltfData] = await Promise.all([
    getHTFData(pair),
    getLTFData(pair),
  ]);

  return {
    htf: htfData,
    ltf: ltfData,
    pair,
  };
}

/**
 * Clear cache for a pair
 */
export async function clearCache(pair: string, interval?: string) {
  const redis = getRedis();

  if (interval) {
    const key = `ohlcv:${pair}:${interval}`;
    await redis.del(key);
    log.debug({ pair, interval }, "Cleared cache");
  } else {
    // Clear all intervals for this pair
    const pattern = `ohlcv:${pair}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      log.debug({ pair, count: keys.length }, "Cleared all caches for pair");
    }
  }
}
