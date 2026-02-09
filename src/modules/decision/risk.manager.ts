import { RiskProfile, getRiskRewardTargets, getATRMultiplier } from "./models";
import { MarketMetrics } from "@/modules/market/metrics.service";
import { roundTo, calculateRiskReward } from "@/utils/math";
import { createLogger } from "@/utils/logger";

const log = createLogger("RiskManager");

export interface RiskCalculation {
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  riskReward: number;
}

/**
 * Calculate stop loss based on ATR and risk profile
 */
export function calculateStopLoss(
  entry: number,
  metrics: MarketMetrics,
  risk: RiskProfile,
  side: "long" | "short"
): number {
  const atrMultiplier = getATRMultiplier(risk);
  const atrValue = (metrics.atrPercent / 100) * entry;
  const stopDistance = atrValue * atrMultiplier;

  const stopLoss =
    side === "long" ? entry - stopDistance : entry + stopDistance;

  return roundTo(stopLoss, 8);
}

/**
 * Calculate take profit levels based on risk/reward targets
 */
export function calculateTakeProfits(
  entry: number,
  stopLoss: number,
  risk: RiskProfile
): number[] {
  const risk_distance = Math.abs(entry - stopLoss);
  const targets = getRiskRewardTargets(risk);

  const takeProfits = targets.map((rr) => {
    const profitDistance = risk_distance * rr;
    // Assume long for now, will be adjusted by caller if short
    return entry + profitDistance;
  });

  return takeProfits.map((tp) => roundTo(tp, 8));
}

/**
 * Calculate risk parameters for a trade
 */
export function calculateRisk(
  entry: number,
  metrics: MarketMetrics,
  risk: RiskProfile,
  side: "long" | "short"
): RiskCalculation {
  const stopLoss = calculateStopLoss(entry, metrics, risk, side);
  const takeProfits = calculateTakeProfits(entry, stopLoss, risk);

  // Adjust TP levels if short trade
  const adjustedTPs =
    side === "short"
      ? takeProfits.map((tp) => {
          // For short, we need to reverse: entry - distance instead of entry + distance
          const distance = tp - entry;
          return entry - distance;
        })
      : takeProfits;

  const riskReward = calculateRiskReward(entry, stopLoss, adjustedTPs[0]);

  log.debug(
    {
      entry,
      stopLoss,
      takeProfits: adjustedTPs,
      riskReward,
      side,
      risk,
    },
    "Calculated risk parameters"
  );

  return {
    entry,
    stopLoss,
    takeProfits: adjustedTPs,
    riskReward,
  };
}
