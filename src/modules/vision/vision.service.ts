import OpenAI from "openai";
import { config } from "@/config/env";
import { createLogger } from "@/utils/logger";

const log = createLogger("VisionService");

export interface VisionAnalysis {
  support_levels: number[];
  resistance_levels: number[];
  patterns: string[];
  structure: string;
  description: string;
}

/**
 * Analyze chart image using OpenAI Vision API
 */
export async function analyzeChart(
  imageBase64: string
): Promise<VisionAnalysis> {
  if (!config.OPENAI_API_KEY) {
    log.warn("OpenAI API key not configured, skipping vision analysis");
    return {
      support_levels: [],
      resistance_levels: [],
      patterns: [],
      structure: "unknown",
      description: "Vision analysis skipped - no API key",
    };
  }

  const client = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.VISION_TIMEOUT_MS);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this trading chart image and provide a JSON response with the following structure:
{
  "support_levels": [numbers representing support levels from the chart],
  "resistance_levels": [numbers representing resistance levels from the chart],
  "patterns": ["pattern names you identify, e.g., 'head and shoulders', 'double bottom'"],
  "structure": "trend|range|breakout|reversal",
  "description": "brief analysis of what you see"
}

Focus on identifying key levels, patterns, and the current market structure. Be precise with numbers.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    clearTimeout(timeoutId);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from vision API");
    }

    // Parse JSON from response
    const jsonMatch = (content as string).match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from vision response");
    }

    const analysis: VisionAnalysis = JSON.parse(jsonMatch[0]);
    log.debug({ analysis }, "Vision analysis complete");
    return analysis;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.message.includes("AbortError")) {
      log.error("Vision API timeout");
      throw new Error(
        `Vision analysis timeout after ${config.VISION_TIMEOUT_MS}ms`
      );
    }

    log.error({ error }, "Vision analysis failed");
    throw error;
  }
}
