import { MarketMetrics } from "@/modules/market/metrics.service";
import { Candle } from "@/modules/market/binance.client";
import { VisionAnalysis } from "@/modules/vision/vision.service";

export interface LLMMarketInterpretation {
  bias: "bullish" | "bearish" | "neutral";
  structure: "trend" | "range" | "breakout" | "reversal";
  key_levels: number[];
  liquidity: "above" | "below" | "both" | "none";
  volatility: "low" | "normal" | "high";
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Build prompt for LLM market analysis
 */
export function buildMarketAnalysisPrompt(
  pair: string,
  metrics: MarketMetrics,
  candles: Candle[],
  visionData?: VisionAnalysis
): string {
  const lastCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  const priceChange =
    ((lastCandle.close - previousCandle.close) / previousCandle.close) * 100;

  let prompt = `You are a professional crypto trading analyst. Analyze the following market data and provide a structured JSON response.

**Trading Pair**: ${pair}
**Current Price**: $${lastCandle.close.toFixed(2)}
**Price Change (Last Candle)**: ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%
**ATR Volatility**: ${metrics.atrPercent.toFixed(2)}%
**24h Range**: ${metrics.range24h.toFixed(2)}%
**Trend Regime**: ${metrics.trendRegime}
**Volatility Regime**: ${metrics.volatilityRegime}
**SMA20**: ${metrics.sma20 ? `$${metrics.sma20.toFixed(2)}` : "N/A"}
**SMA50**: ${metrics.sma50 ? `$${metrics.sma50.toFixed(2)}` : "N/A"}

Recent Price Action (Last 5 candles):
${candles
  .slice(-5)
  .map((c, i) => `${i + 1}. O: $${c.open.toFixed(2)} H: $${c.high.toFixed(2)} L: $${c.low.toFixed(2)} C: $${c.close.toFixed(2)}`)
  .join("\n")}
`;

  if (visionData) {
    prompt += `
**Chart Analysis (from image)**:
Support Levels: ${visionData.support_levels.join(", ")}
Resistance Levels: ${visionData.resistance_levels.join(", ")}
Identified Patterns: ${visionData.patterns.join(", ")}
Chart Structure: ${visionData.structure}
Description: ${visionData.description}
`;
  }

  prompt += `
Provide your analysis as JSON with this exact structure:
{
  "bias": "bullish|bearish|neutral",
  "structure": "trend|range|breakout|reversal",
  "key_levels": [numbers representing key support/resistance levels],
  "liquidity": "above|below|both|none",
  "volatility": "low|normal|high",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of your analysis"
}

Key points:
- Analyze trend direction and structure
- Identify key price levels from recent price action and SMAs
- Consider volatility regime when assessing confidence
- Determine if price is likely above or below major support/resistance
- Confidence should reflect your conviction in the bias

Only respond with valid JSON, no other text.`;

  return prompt;
}

/**
 * System prompt for LLM
 */
export const SYSTEM_PROMPT = `You are an expert crypto trading analyst with 10+ years of experience.
Your job is to analyze market structure and provide unbiased technical analysis.
Focus on objective analysis - identify trends, support/resistance, and market regime.
Your output will be used by a deterministic trading engine to make trading decisions.
Be precise and confident in your analysis.`;
