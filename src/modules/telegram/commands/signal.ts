import { Context } from "../types";
import { TradingAPIClient } from "../api-client";
import {
  formatTradeSetup,
  formatProcessing,
  formatError,
} from "../formatters/signal";
import { resultActionsKeyboard } from "../keyboards";
import { createLogger } from "@/utils/logger";
import { config } from "@/config/env";

const log = createLogger("SignalCommand");

export async function handleSignalCommand(
  ctx: Context,
  apiClient: TradingAPIClient
) {
  try {
    const userId = String(ctx.from?.id || "anonymous");
    const args = ctx.match?.toString().split(/\s+/).filter(Boolean) || [];

    // Show deprecation message and redirect to button flow
    if (args.length > 0) {
      await ctx.reply(
        `ℹ️ *Command syntax changed!*\n\nInstead of typing \`/signal PAIR HOLDING RISK\`, please use the button-based flow:\n\n1️⃣ Click "Get AI Signal"\n2️⃣ Choose your master\n3️⃣ Enter your pair\n\nThis provides a better experience with chart analysis!\n\nKetik /start untuk mulai.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Parse command: /signal PAIR HOLDING RISK (legacy support)
    if (args.length < 3) {
      await ctx.reply(
        `ℹ️ *Cara baru menggunakan bot:*\n\nSekarang gunakan tombol untuk membuat signal:\n\n1️⃣ Ketik /start\n2️⃣ Pilih "Get AI Signal"\n3️⃣ Ikuti langkah-langkahnya\n\nKetik /start untuk mulai.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const pair = args[0]?.toUpperCase();
    const holding = args[1]?.toLowerCase();
    const risk = args[2]?.toLowerCase();

    // Validate parameters
    if (!pair || !holding || !risk) {
      await ctx.reply("❌ Missing required parameters", {
        parse_mode: "Markdown",
      });
      return;
    }

    const validHoldings = ["scalp", "daily", "swing", "auto"];
    const validRisks = ["safe", "growth", "aggressive"];

    if (!validHoldings.includes(holding)) {
      await ctx.reply(
        `❌ Invalid holding: ${holding}\nValid: ${validHoldings.join(", ")}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    if (!validRisks.includes(risk)) {
      await ctx.reply(
        `❌ Invalid risk: ${risk}\nValid: ${validRisks.join(", ")}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Send processing message
    const processingMsg = await ctx.reply(formatProcessing(pair), {
      parse_mode: "Markdown",
    });

    try {
      // Create signal
      const result = await apiClient.createSignal(userId, {
        pair: pair as string,
        holding: holding as "scalp" | "daily" | "swing" | "auto",
        risk: risk as "safe" | "growth" | "aggressive",
      });

      const jobId = result.jobId;

      // Store in session for later reference
      ctx.session.lastJobId = jobId;
      ctx.session.lastPair = pair;
      ctx.session.lastHolding = holding;
      ctx.session.lastRisk = risk;

      // Poll for result
      try {
        const signalResult = await apiClient.pollSignalUntilComplete(
          userId,
          jobId,
          config.TELEGRAM_MAX_POLL_ATTEMPTS,
          config.TELEGRAM_POLLING_INTERVAL
        );

        // Delete processing message
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
        } catch (e) {
          // Ignore delete errors
        }

        // Send result
        const resultMessage = formatTradeSetup(signalResult);
        await ctx.reply(resultMessage, {
          parse_mode: "Markdown",
          reply_markup: resultActionsKeyboard,
        });

        log.info(
          { userId, pair, jobId, side: signalResult.setup?.side },
          "Signal completed"
        );
      } catch (pollError) {
        log.warn({ userId, jobId, error: pollError }, "Poll timeout");

        // Delete processing message
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
        } catch (e) {
          // Ignore delete errors
        }

        await ctx.reply(
          `⏳ *Signal processing*\n\nJob ID: \`${jobId}\`\n\nUse /status ${jobId} to check later`,
          { parse_mode: "Markdown" }
        );
      }
    } catch (apiError) {
      // Delete processing message
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      } catch (e) {
        // Ignore delete errors
      }

      const errorMsg = formatError(apiError instanceof Error ? apiError : String(apiError));
      await ctx.reply(errorMsg, { parse_mode: "Markdown" });

      log.error({ userId, pair, error: apiError }, "Signal creation failed");
    }
  } catch (error) {
    log.error({ error }, "Signal command failed");
    await ctx.reply("❌ Command failed. Please try again.", {
      parse_mode: "Markdown",
    });
  }
}
