import { getMarketData, clearCache } from "@/modules/market/ohlcv.service";
import { calculateMetrics, isMarketTradeable } from "@/modules/market/metrics.service";
import { interpretMarketWithRetry } from "@/modules/ai/llm.service";
import { analyzeChart } from "@/modules/vision/vision.service";
import { buildTradeSetup, validateTradeSetup } from "@/modules/decision/decision.engine";
import { TradeSetup, RiskProfile, HoldingStrategy } from "@/modules/decision/models";
import { getDatabase } from "@/db/postgres";
import { signalResults } from "@/db/schema";
import { createLogger } from "@/utils/logger";

const log = createLogger("SignalProcessor");

export interface ProcessingResult {
  setup: TradeSetup;
  confidence: number;
  metrics: any;
  interpretation: any;
}

/**
 * Process a signal job end-to-end
 */
export async function processSignal(
  jobId: string,
  pair: string,
  holding: HoldingStrategy,
  risk: RiskProfile,
  imageBase64?: string
): Promise<ProcessingResult> {
  try {
    log.info({ jobId, pair }, "Starting signal processing");

    // Step 1: Fetch market data
    log.debug({ jobId }, "Fetching market data");
    const marketData = await getMarketData(pair);

    // Step 2: Calculate metrics
    log.debug({ jobId }, "Calculating metrics");
    const metrics = calculateMetrics(marketData.htf);

    // Check if market is tradeable
    if (!isMarketTradeable(metrics)) {
      log.info({ jobId, metrics }, "Market not tradeable - low volatility");
      return {
        setup: {
          side: "no_trade",
          entry: 0,
          stopLoss: 0,
          takeProfits: [],
          riskReward: 0,
          confidence: 0,
          reason: "Market not tradeable - low volatility/range",
        },
        confidence: 0,
        metrics,
        interpretation: null,
      };
    }

    // Step 3: Vision analysis (if image provided)
    let visionData = undefined;
    if (imageBase64) {
      try {
        log.debug({ jobId }, "Analyzing chart image");
        visionData = await analyzeChart(imageBase64);
        log.debug({ jobId }, "Vision analysis complete");
      } catch (error) {
        log.warn({ jobId, error }, "Vision analysis failed, continuing without it");
      }
    }

    // Step 4: LLM interpretation
    log.debug({ jobId }, "Getting LLM interpretation");
    const interpretation = await interpretMarketWithRetry(
      pair,
      metrics,
      marketData.htf,
      visionData
    );

    // Step 5: Decision engine
    log.debug({ jobId }, "Building trade setup");
    const setup = buildTradeSetup(interpretation, metrics, risk);

    // Step 6: Validate
    if (setup.side !== "no_trade" && !validateTradeSetup(setup)) {
      log.warn({ jobId, setup }, "Trade setup validation failed");
      return {
        setup: {
          side: "no_trade",
          entry: 0,
          stopLoss: 0,
          takeProfits: [],
          riskReward: 0,
          confidence: 0,
          reason: "Setup validation failed",
        },
        confidence: 0,
        metrics,
        interpretation,
      };
    }

    // Step 7: Save to database
    log.debug({ jobId }, "Saving result to database");
    const db = getDatabase();
    await db.insert(signalResults).values({
      jobId,
      side: setup.side,
      entry: setup.side !== "no_trade" ? setup.entry.toString() : null,
      stopLoss: setup.side !== "no_trade" ? setup.stopLoss.toString() : null,
      takeProfits:
        setup.side !== "no_trade" ? JSON.stringify(setup.takeProfits) : "[]",
      riskReward: setup.side !== "no_trade" ? setup.riskReward.toString() : "0",
      confidence: interpretation.confidence.toString(),
      reason: setup.reason,
      marketInterpretation: interpretation as any,
      visionAnalysis: visionData as any,
      metrics: metrics as any,
    });

    log.info(
      { jobId, side: setup.side, confidence: setup.confidence },
      "Signal processing complete"
    );

    return {
      setup,
      confidence: interpretation.confidence,
      metrics,
      interpretation,
    };
  } catch (error) {
    log.error({ jobId, error }, "Signal processing failed");
    throw error;
  } finally {
    // Clear cache after processing
    try {
      await clearCache(pair);
    } catch (error) {
      log.warn({ pair, error }, "Failed to clear cache");
    }
  }
}
