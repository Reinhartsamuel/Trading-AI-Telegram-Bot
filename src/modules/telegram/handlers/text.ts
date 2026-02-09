import { Context } from "../types";
import {
  holdingStrategyKeyboardWithBack,
  chartUploadPromptKeyboard,
} from "../keyboards";
import { createLogger } from "@/utils/logger";

const log = createLogger("TextHandler");

const tickerExamples: Record<string, string[]> = {
  crypto: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"],
  forex: ["EURUSD", "GBPJPY", "USDJPY", "AUDUSD"],
  gold: ["XAUUSD"],
  stock: ["AAPL", "BBCA", "TSLA", "GOOGL"],
};

/**
 * Normalize and validate ticker input
 */
function normalizeTicker(text: string): string {
  return text.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Validate ticker format
 */
function isValidTicker(ticker: string): boolean {
  // Allow 3-20 alphanumeric characters
  return /^[A-Z0-9]{3,20}$/.test(ticker);
}

/**
 * Handle text message when waiting for ticker input
 */
export async function handleTickerInput(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    const text = ctx.message?.text;

    if (!text) {
      log.warn({ userId }, "Empty text message received");
      return;
    }

    // Check if we're expecting a ticker
    if (ctx.session.flowStep !== "ticker_input" || !ctx.session.waitingForTicker) {
      log.debug(
        { userId, flowStep: ctx.session.flowStep },
        "Text received but not in ticker input state"
      );
      return;
    }

    const master = ctx.session.master as string;
    const ticker = normalizeTicker(text);

    log.info({ userId, ticker, master }, "Processing ticker input");

    // Validate ticker format
    if (!isValidTicker(ticker)) {
      const examples = tickerExamples[master] || tickerExamples.crypto;
      const exampleStr = examples.join(", ");

      log.warn({ userId, ticker }, "Invalid ticker format");
      await ctx.reply(
        `❌ Ticker tidak valid. Contoh: ${exampleStr}\n\nKetik saja tanpa simbol lain.`,
        {
          parse_mode: "Markdown",
        }
      );
      return;
    }

    // Store ticker in session
    ctx.session.lastPair = ticker;
    ctx.session.flowStep = "chart_upload_prompt";
    ctx.session.waitingForTicker = false;
    ctx.session.waitingForChart = true;

    log.info({ userId, ticker }, "Ticker validated, prompting chart upload");

    // Show chart upload prompt
    const message = `✅ Ticker *${ticker}* diterima!

📊 Sekarang upload screenshot chart TradingView untuk analisis visual.

Atau klik "Lanjut tanpa chart" untuk analisis tanpa gambar.`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: chartUploadPromptKeyboard,
    });
  } catch (error) {
    log.error({ error }, "Ticker input handler failed");
    await ctx.reply("❌ Error processing ticker. Please try again.");
  }
}

/**
 * Handle text messages in other contexts
 */
export async function handleGeneralText(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const flowStep = ctx.session.flowStep;

  log.debug({ userId, flowStep }, "General text message received");

  // If user sends text outside of expected flows, show them what to do
  if (!flowStep || flowStep === "idle") {
    await ctx.reply(
      "Ketik /start untuk buka menu utama.",
      {
        parse_mode: "Markdown",
      }
    );
  }
}
