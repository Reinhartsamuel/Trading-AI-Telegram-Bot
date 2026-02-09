import { config } from "@/config/env";
import { createLogger } from "@/utils/logger";

const log = createLogger("BinanceClient");

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
}

/**
 * Fetch OHLCV data from Binance public API
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 500
): Promise<Candle[]> {
  const url = new URL(`${config.BINANCE_API_URL}/klines`);
  url.searchParams.append("symbol", symbol);
  url.searchParams.append("interval", interval);
  url.searchParams.append("limit", limit.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Binance API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Parse Binance response format
    const candles: Candle[] = data.map(
      (kline: any) => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteAssetVolume: parseFloat(kline[7]),
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: parseFloat(kline[9]),
        takerBuyQuoteAssetVolume: parseFloat(kline[10]),
      })
    );
    console.log(candles,'candles')

    log.debug(
      { symbol, interval, count: candles.length },
      "Fetched candles from Binance"
    );
    return candles;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      log.error(
        { symbol, interval },
        `Request timeout after ${config.REQUEST_TIMEOUT_MS}ms`
      );
      throw new Error(`Binance API timeout for ${symbol} ${interval}`);
    }

    log.error({ symbol, interval, error }, "Failed to fetch candles");
    throw error;
  }
}

/**
 * Fetch with retry logic
 */
export async function fetchKlinesWithRetry(
  symbol: string,
  interval: string,
  limit: number = 500,
  maxRetries: number = config.MAX_RETRIES
): Promise<Candle[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchKlines(symbol, interval, limit);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt - 1) * 100; // Exponential backoff
      log.warn(
        { symbol, interval, attempt, maxRetries, delayMs },
        "Retrying Binance API call"
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Max retries exceeded");
}
