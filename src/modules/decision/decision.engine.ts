import { LLMMarketInterpretation } from "@/modules/ai/prompts/market-analysis";
import { MarketMetrics } from "@/modules/market/metrics.service";
import {
  TradeSetup,
  RiskProfile,
  MIN_RISK_REWARD,
  getMinConfidence,
  isVolatilityAcceptable,
} from "./models";
import { calculateRisk } from "./risk.manager";
import { createLogger } from "@/utils/logger";

const log = createLogger("DecisionEngine");

/**
 * Build deterministic trade setup from market interpretation
 */
export function buildTradeSetup(
  interpretation: LLMMarketInterpretation,
  metrics: MarketMetrics,
  risk: RiskProfile
): TradeSetup {
  // Rule 1: Don't trade in low volatility
  if (!isVolatilityAcceptable(interpretation.volatility)) {
    log.info("Rejecting trade: Low volatility regime");
    return {
      side: "no_trade",
      entry: 0,
      stopLoss: 0,
      takeProfits: [],
      riskReward: 0,
      confidence: 0,
      reason: "Low volatility regime - no trade",
    };
  }

  // Rule 2: Reject if confidence is below threshold
  const minConfidence = getMinConfidence(risk);
  if (interpretation.confidence < minConfidence) {
    log.info(
      { confidence: interpretation.confidence, minConfidence },
      "Rejecting trade: Low confidence"
    );
    return {
      side: "no_trade",
      entry: 0,
      stopLoss: 0,
      takeProfits: [],
      riskReward: 0,
      confidence: interpretation.confidence,
      reason: `Low confidence: ${interpretation.confidence.toFixed(2)} < ${minConfidence}`,
    };
  }

  // Determine side and entry
  let side: "long" | "short" = "long";
  let entry = metrics.currentPrice;

  switch (interpretation.bias) {
    case "bullish":
      side = "long";
      // Entry at support level or current price
      if (interpretation.key_levels.length > 0) {
        const support = interpretation.key_levels[0];
        entry = Math.min(metrics.currentPrice, support);
      }
      break;

    case "bearish":
      side = "short";
      // Entry at resistance or current price
      if (interpretation.key_levels.length > 0) {
        const resistance = interpretation.key_levels[interpretation.key_levels.length - 1];
        entry = Math.max(metrics.currentPrice, resistance);
      }
      break;

    case "neutral":
      log.info("Rejecting trade: Neutral bias");
      return {
        side: "no_trade",
        entry: 0,
        stopLoss: 0,
        takeProfits: [],
        riskReward: 0,
        confidence: interpretation.confidence,
        reason: "Neutral bias - no directional conviction",
      };
  }

  // Calculate risk parameters
  const riskCalc = calculateRisk(entry, metrics, risk, side);

  // Rule 3: Reject if R:R < 1.2
  if (riskCalc.riskReward < MIN_RISK_REWARD) {
    log.info(
      {
        riskReward: riskCalc.riskReward,
        minRR: MIN_RISK_REWARD,
      },
      "Rejecting trade: Poor risk/reward"
    );
    return {
      side: "no_trade",
      entry: 0,
      stopLoss: 0,
      takeProfits: [],
      riskReward: 0,
      confidence: interpretation.confidence,
      reason: `Poor R:R ratio: ${riskCalc.riskReward.toFixed(2)} < ${MIN_RISK_REWARD}`,
    };
  }

  const setup: TradeSetup = {
    side,
    entry: riskCalc.entry,
    stopLoss: riskCalc.stopLoss,
    takeProfits: riskCalc.takeProfits,
    riskReward: riskCalc.riskReward,
    confidence: interpretation.confidence,
    reason: `${side.toUpperCase()} setup: ${interpretation.bias}, Structure: ${interpretation.structure}, R:R: ${riskCalc.riskReward.toFixed(2)}`,
  };

  log.info({ setup }, "Trade setup generated");
  return setup;
}

/**
 * Validate trade setup
 */
export function validateTradeSetup(setup: TradeSetup): boolean {
  if (setup.side === "no_trade") {
    return true;
  }

  // Validate entry vs stop loss
  if (setup.side === "long") {
    if (setup.entry <= setup.stopLoss) {
      log.warn({ setup }, "Invalid long setup: entry <= stopLoss");
      return false;
    }
  } else {
    if (setup.entry >= setup.stopLoss) {
      log.warn({ setup }, "Invalid short setup: entry >= stopLoss");
      return false;
    }
  }

  // Validate take profits
  if (setup.takeProfits.length === 0) {
    log.warn({ setup }, "No take profit levels");
    return false;
  }

  if (setup.side === "long") {
    for (const tp of setup.takeProfits) {
      if (tp <= setup.entry) {
        log.warn({ tp, entry: setup.entry }, "Invalid TP for long: TP <= entry");
        return false;
      }
    }
  } else {
    for (const tp of setup.takeProfits) {
      if (tp >= setup.entry) {
        log.warn({ tp, entry: setup.entry }, "Invalid TP for short: TP >= entry");
        return false;
      }
    }
  }

  return true;
}
