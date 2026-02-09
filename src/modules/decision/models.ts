import { LLMMarketInterpretation } from "@/modules/ai/prompts/market-analysis";
import { MarketMetrics } from "@/modules/market/metrics.service";

export type RiskProfile = "safe" | "growth" | "aggressive";
export type HoldingStrategy = "scalp" | "daily" | "swing" | "auto";

export interface TradeSetup {
  side: "long" | "short" | "no_trade";
  entry: number;
  stopLoss: number;
  takeProfits: number[]; // [1.5R, 2.5R, 4R]
  riskReward: number;
  confidence: number;
  reason: string;
}

export interface SignalRequest {
  pair: string;
  holding: HoldingStrategy;
  risk: RiskProfile;
  imageBase64?: string;
}

export interface SignalResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  setup?: TradeSetup;
  interpretation?: LLMMarketInterpretation;
  metrics?: MarketMetrics;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Get ATR multiplier based on risk profile
 */
export function getATRMultiplier(risk: RiskProfile): number {
  switch (risk) {
    case "safe":
      return 2.5;
    case "growth":
      return 1.8;
    case "aggressive":
      return 1.2;
  }
}

/**
 * Get risk/reward targets based on risk profile
 */
export function getRiskRewardTargets(risk: RiskProfile): number[] {
  // Return [1.5R, 2.5R, 4R] for all profiles
  // Can be customized per risk level
  return [1.5, 2.5, 4];
}

/**
 * Get minimum confidence required based on risk profile
 */
export function getMinConfidence(risk: RiskProfile): number {
  switch (risk) {
    case "safe":
      return 0.75; // High confidence needed
    case "growth":
      return 0.65; // Moderate confidence
    case "aggressive":
      return 0.6; // Lower confidence threshold
  }
}

/**
 * Minimum R:R ratio to accept a trade
 */
export const MIN_RISK_REWARD = 1.2;

/**
 * Check if volatility regime is suitable for trading
 */
export function isVolatilityAcceptable(regime: "low" | "normal" | "high"): boolean {
  return regime !== "low";
}
