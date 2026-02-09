import { Context } from "../types";
import { chartUploadPromptKeyboard } from "../keyboards";
import { createLogger } from "@/utils/logger";

const log = createLogger("MasterHandler");

const masterMessages: Record<string, { title: string; examples: string }> = {
  crypto: {
    title: "✅ CRYPTO MASTER Activated",
    examples: "BTCUSDT, ETHUSDT, SOLUSDT",
  },
  forex: {
    title: "✅ FOREX MASTER Activated",
    examples: "EURUSD, GBPJPY, USDJPY",
  },
  gold: {
    title: "✅ GOLD MASTER Activated",
    examples: "XAUUSD",
  },
  stock: {
    title: "✅ STOCK MASTER Activated",
    examples: "AAPL, BBCA, TSLA",
  },
};

export async function handleMasterSelection(
  ctx: Context,
  master: "crypto" | "forex" | "gold" | "stock"
) {
  try {
    const userId = ctx.from?.id;
    log.info({ userId, master }, "Master selected");

    // Store master in session
    ctx.session.master = master;
    ctx.session.flowStep = "ticker_input";
    ctx.session.waitingForTicker = true;

    const masterData = masterMessages[master];

    const message = `${masterData.title}

Sekarang kirim pair/ticker.
Contoh: ${masterData.examples}

Ketik saja, tanpa simbol lain.

📊 Setelah kirim ticker, kamu bisa upload screenshot chart TradingView untuk analisis visual.`;

    // Answer the callback query
    await ctx.answerCallbackQuery();

    // Send the message with chart upload prompt keyboard
    // The keyboard will appear after user enters ticker
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: chartUploadPromptKeyboard,
    });
  } catch (error) {
    log.error({ error }, "Master selection handler failed");
    await ctx.answerCallbackQuery("❌ Error processing selection");
    await ctx.reply("❌ Error processing master selection. Please try again.");
  }
}
