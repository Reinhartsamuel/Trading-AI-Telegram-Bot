import OpenAI from "openai";
import { z } from "zod";
import { config } from "@/config/env";
import { createLogger } from "@/utils/logger";
import {
  LLMMarketInterpretation,
  buildMarketAnalysisPrompt,
  SYSTEM_PROMPT,
} from "./prompts/market-analysis";
import { MarketMetrics } from "@/modules/market/metrics.service";
import { Candle } from "@/modules/market/binance.client";
import { VisionAnalysis } from "@/modules/vision/vision.service";

const log = createLogger("LLMService");

// Zod schema for validating LLM response
const MarketInterpretationSchema = z.object({
  bias: z.enum(["bullish", "bearish", "neutral"]),
  structure: z.enum(["trend", "range", "breakout", "reversal"]),
  key_levels: z.array(z.number()),
  liquidity: z.enum(["above", "below", "both", "none"]),
  volatility: z.enum(["low", "normal", "high"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

/**
 * Interpret market using LLM (OpenAI or DeepSeek)
 */
export async function interpretMarket(
  pair: string,
  metrics: MarketMetrics,
  candles: Candle[],
  visionData?: VisionAnalysis,
  provider: "openai" | "deepseek" = "openai"
): Promise<LLMMarketInterpretation> {
  const prompt = buildMarketAnalysisPrompt(pair, metrics, candles, visionData);

  try {
    const interpretation = await callLLM(prompt, provider);
    const validated = MarketInterpretationSchema.parse(interpretation);

    log.debug(
      { pair, bias: validated.bias, confidence: validated.confidence },
      "Market interpretation complete"
    );
    return validated;
  } catch (error) {
    log.error({ pair, error }, "Failed to interpret market");
    throw error;
  }
}

/**
 * Call LLM provider
 */
async function callLLM(
  userPrompt: string,
  provider: "openai" | "deepseek" = "openai"
): Promise<LLMMarketInterpretation> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.LLM_TIMEOUT_MS);

  try {
    let client: OpenAI;
    let model: string;

    if (provider === "deepseek") {
      if (!config.DEEPSEEK_API_KEY) {
        throw new Error("DeepSeek API key not configured");
      }
      client = new OpenAI({
        apiKey: config.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com",
      });
      model = "deepseek-chat";
    } else {
      if (!config.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }
      client = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });
      model = "gpt-4";
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    clearTimeout(timeoutId);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from LLM response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.message.includes("AbortError")) {
      throw new Error(`LLM timeout after ${config.LLM_TIMEOUT_MS}ms`);
    }

    throw error;
  }
}

/**
 * Call LLM with retry logic
 */
export async function interpretMarketWithRetry(
  pair: string,
  metrics: MarketMetrics,
  candles: Candle[],
  visionData?: VisionAnalysis,
  maxRetries: number = config.MAX_RETRIES
): Promise<LLMMarketInterpretation> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await interpretMarket(pair, metrics, candles, visionData);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
      log.warn(
        { pair, attempt, maxRetries, delayMs },
        "Retrying LLM interpretation"
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Max retries exceeded");
}
