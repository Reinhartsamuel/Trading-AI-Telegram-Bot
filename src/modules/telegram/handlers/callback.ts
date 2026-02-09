import { Context } from "../types";
import { TradingAPIClient } from "../api-client";
import {
  holdingStrategyKeyboard,
  riskProfileKeyboard,
  tradingPairKeyboard,
  masterSelectionKeyboard,
  mainMenuKeyboard,
  confirmationKeyboard,
  holdingStrategyKeyboardWithBack,
  riskProfileKeyboardWithBack,
  navigationKeyboard,
} from "../keyboards";
import {
  formatTradeSetup,
  formatProcessing,
  formatError,
  formatConfirmation,
} from "../formatters/signal";
import { resultActionsKeyboard } from "../keyboards";
import { handleMasterSelection } from "./master";
import { createLogger } from "@/utils/logger";
import { config } from "@/config/env";

const log = createLogger("CallbackHandler");

export async function handleCallbackQuery(
  ctx: Context,
  apiClient: TradingAPIClient
) {
  try {
    const userId = String(ctx.from?.id || "anonymous");
    const data = ctx.callbackQuery?.data || "";

    if (!data) {
      await ctx.answerCallbackQuery();
      return;
    }

    const [category, value] = data.split(":");
    log.debug({ userId, category, value }, "Callback query received");

    // ====== MAIN MENU ACTIONS ======
    if (category === "menu") {
      return handleMainMenuAction(ctx, apiClient, userId, value);
    }

    // ====== MASTER SELECTION ======
    if (category === "master") {
      const master = value as "crypto" | "forex" | "gold" | "stock";
      return handleMasterSelection(ctx, master);
    }

    // ====== CHART UPLOAD FLOW ======
    if (category === "chart") {
      return handleChartPrompt(ctx, value);
    }

    // ====== NAVIGATION (Back, Menu, Cancel) ======
    if (category === "nav") {
      return handleNavigation(ctx, value);
    }

    // ====== CONFIRMATION ======
    if (category === "confirm") {
      return handleConfirmation(ctx, apiClient, userId, value);
    }

    // ====== RESULT ACTIONS ======
    if (category === "result") {
      return handleResultAction(ctx, value);
    }

    // ====== LEGACY: PAIR SELECTION (for backward compatibility) ======
    if (category === "pair") {
      if (value === "custom") {
        await ctx.reply(
          "Please send pair name (e.g., BTCUSDT):",
          { parse_mode: "Markdown" }
        );
        ctx.session.state = "waiting_pair";
      } else {
        ctx.session.lastPair = value;
        ctx.session.state = "waiting_holding";

        await ctx.editMessageText(
          `✅ Pair: \`${value}\`\n\nSelect holding strategy:`,
          {
            parse_mode: "Markdown",
            reply_markup: holdingStrategyKeyboard,
          }
        );
      }
      await ctx.answerCallbackQuery();
      return;
    }

    // ====== LEGACY: HOLDING SELECTION ======
    if (category === "holding") {
      ctx.session.lastHolding = value;
      ctx.session.state = "waiting_risk";

      await ctx.editMessageText(
        `✅ Holding: \`${value}\`\n\nSelect risk profile:`,
        {
          parse_mode: "Markdown",
          reply_markup: riskProfileKeyboard,
        }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    // ====== LEGACY: RISK SELECTION ======
    if (category === "risk") {
      ctx.session.lastRisk = value;
      return executeSignalCreation(ctx, apiClient, userId);
    }

    // ====== LEGACY: QUICK ACTIONS ======
    if (category === "action") {
      return handleLegacyAction(ctx, value);
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    log.error({ error }, "Callback handler failed");
    await ctx.answerCallbackQuery({ text: "❌ Error processing request" });
  }
}

// ====== HANDLER FUNCTIONS ======

async function handleMainMenuAction(
  ctx: Context,
  apiClient: TradingAPIClient,
  userId: string,
  action: string
): Promise<void> {
  const mvpMessage = (feature: string) =>
    `⏳ *${feature}* (MVP)\n\nNanti fitur ini kita isi. Sekarang balik dulu ya.`;

  await ctx.answerCallbackQuery();

  switch (action) {
    case "signal":
      // Start new signal flow
      ctx.session.flowStep = "master_selection";
      ctx.session.flowHistory = [];
      await ctx.reply(
        "Pilih Master AI yang ingin kamu gunakan:",
        {
          parse_mode: "Markdown",
          reply_markup: masterSelectionKeyboard,
        }
      );
      break;

    case "chart":
      // Chart-first flow
      await ctx.reply(
        "📸 Sekarang upload screenshot chart TradingView.\n\nAtau klik tombol di bawah.",
        {
          parse_mode: "Markdown",
          reply_markup: navigationKeyboard,
        }
      );
      ctx.session.flowStep = "chart_upload_prompt";
      ctx.session.waitingForChart = true;
      break;

    case "profit":
      await ctx.reply(mvpMessage("Profit Simulator"), {
        parse_mode: "Markdown",
        reply_markup: navigationKeyboard,
      });
      break;

    case "unlock":
      await ctx.reply(mvpMessage("Unlock Access"), {
        parse_mode: "Markdown",
        reply_markup: navigationKeyboard,
      });
      break;

    case "affiliate":
      await ctx.reply(mvpMessage("Affiliate Program"), {
        parse_mode: "Markdown",
        reply_markup: navigationKeyboard,
      });
      break;

    case "testimonials":
      await ctx.reply(mvpMessage("Testimonials"), {
        parse_mode: "Markdown",
        reply_markup: navigationKeyboard,
      });
      break;

    case "cs":
      await ctx.reply(
        "📞 *Customer Service*\n\nSilakan hubungi kami di support@example.com",
        {
          parse_mode: "Markdown",
          reply_markup: navigationKeyboard,
        }
      );
      break;

    case "help":
      await ctx.reply(
        `❓ *Bantuan*\n\n*Cara Menggunakan Bot:*\n1️⃣ Pilih "Get AI Signal"\n2️⃣ Pilih Master (Crypto/Forex/Gold/Stock)\n3️⃣ Kirim pair/ticker (contoh: BTCUSDT)\n4️⃣ Upload chart atau skip\n5️⃣ Pilih holding strategy\n6️⃣ Pilih risk profile\n7️⃣ Confirm dan dapatkan signal!\n\n*Fitur:*\n📊 Chart analysis dengan GPT-4 Vision\n🤖 Signal generation dengan DeepSeek AI\n💰 Complete trade setup dengan TP/SL\n\nUntuk bantuan lebih lanjut, hubungi /support`,
        {
          parse_mode: "Markdown",
          reply_markup: navigationKeyboard,
        }
      );
      break;

    default:
      log.warn({ action }, "Unknown menu action");
      break;
  }
}

async function handleChartPrompt(ctx: Context, action: string): Promise<void> {
  await ctx.answerCallbackQuery();

  switch (action) {
    case "upload":
      await ctx.reply(
        "📸 Sekarang upload screenshot chart TradingView Anda.",
        {
          parse_mode: "Markdown",
          reply_markup: navigationKeyboard,
        }
      );
      ctx.session.waitingForChart = true;
      break;

    case "skip":
      // Skip chart and go to holding selection
      ctx.session.flowStep = "holding_selection";
      ctx.session.waitingForChart = false;
      ctx.session.chartImage = undefined;

      await ctx.reply(
        "✅ Lanjut tanpa chart.\n\nPilih holding strategy:",
        {
          parse_mode: "Markdown",
          reply_markup: holdingStrategyKeyboardWithBack,
        }
      );
      break;

    case "change_ticker":
      // Go back to ticker input
      ctx.session.flowStep = "ticker_input";
      ctx.session.waitingForTicker = true;
      ctx.session.waitingForChart = false;

      await ctx.reply(
        `Kirim pair/ticker baru. Contoh: BTCUSDT`,
        {
          parse_mode: "Markdown",
        }
      );
      break;

    default:
      log.warn({ action }, "Unknown chart action");
      break;
  }
}

async function handleNavigation(ctx: Context, action: string): Promise<void> {
  await ctx.answerCallbackQuery();

  switch (action) {
    case "back":
      // Go back to previous step
      const currentStep = ctx.session.flowStep;
      const history = ctx.session.flowHistory || [];

      if (currentStep === "ticker_input") {
        // Back to master selection
        ctx.session.flowStep = "master_selection";
        ctx.session.waitingForTicker = false;
        await ctx.reply(
          "Pilih Master AI yang ingin kamu gunakan:",
          {
            parse_mode: "Markdown",
            reply_markup: masterSelectionKeyboard,
          }
        );
      } else if (currentStep === "chart_upload_prompt") {
        // Back to ticker input
        ctx.session.flowStep = "ticker_input";
        ctx.session.waitingForChart = false;
        ctx.session.waitingForTicker = true;
        await ctx.reply(
          `Kirim pair/ticker. Contoh: BTCUSDT`,
          {
            parse_mode: "Markdown",
          }
        );
      } else if (currentStep === "holding_selection") {
        // Back to chart prompt
        ctx.session.flowStep = "chart_upload_prompt";
        ctx.session.waitingForChart = true;

        const pair = ctx.session.lastPair || "N/A";
        await ctx.reply(
          `Ticker: ${pair}\n\n📊 Upload chart atau skip?`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "📸 Upload", callback_data: "chart:upload" },
                  { text: "⏭️ Skip", callback_data: "chart:skip" },
                ],
              ],
            },
          }
        );
      } else if (currentStep === "risk_selection") {
        // Back to holding
        ctx.session.flowStep = "holding_selection";
        await ctx.reply(
          "Pilih holding strategy:",
          {
            parse_mode: "Markdown",
            reply_markup: holdingStrategyKeyboardWithBack,
          }
        );
      } else {
        // Default: go to main menu
        ctx.session.flowStep = "idle";
        await ctx.reply(
          "🤖 *Penasihat Trading Bot*\n\nPilih menu di bawah untuk mulai.",
          {
            parse_mode: "Markdown",
            reply_markup: mainMenuKeyboard,
          }
        );
      }
      break;

    case "menu":
      // Return to main menu
      ctx.session.flowStep = "idle";
      ctx.session.waitingForTicker = false;
      ctx.session.waitingForChart = false;
      ctx.session.chartImage = undefined;

      await ctx.reply(
        "🤖 *Penasihat Trading Bot*\n\nPilih menu di bawah untuk mulai.",
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
      break;

    case "cancel":
      // Cancel current flow
      ctx.session.flowStep = "idle";
      ctx.session.waitingForTicker = false;
      ctx.session.waitingForChart = false;
      ctx.session.chartImage = undefined;
      ctx.session.lastPair = undefined;
      ctx.session.lastHolding = undefined;
      ctx.session.lastRisk = undefined;
      ctx.session.master = undefined;

      await ctx.reply(
        "❌ Dibatalkan.\n\n🤖 Kembali ke menu utama.",
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
      break;

    default:
      log.warn({ action }, "Unknown navigation action");
      break;
  }
}

async function handleConfirmation(
  ctx: Context,
  apiClient: TradingAPIClient,
  userId: string,
  action: string
): Promise<void> {
  await ctx.answerCallbackQuery();

  switch (action) {
    case "yes":
      // Proceed with signal creation
      return executeSignalCreation(ctx, apiClient, userId);

    case "edit":
      // Return to holding selection to edit
      ctx.session.flowStep = "holding_selection";
      await ctx.reply(
        "Ubah holding strategy:",
        {
          parse_mode: "Markdown",
          reply_markup: holdingStrategyKeyboardWithBack,
        }
      );
      break;

    case "cancel":
      // Cancel signal
      ctx.session.flowStep = "idle";
      ctx.session.chartImage = undefined;

      await ctx.reply(
        "❌ Dibatalkan.\n\n🤖 Kembali ke menu utama.",
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
      break;

    default:
      log.warn({ action }, "Unknown confirmation action");
      break;
  }
}

async function handleResultAction(ctx: Context, action: string): Promise<void> {
  await ctx.answerCallbackQuery();

  switch (action) {
    case "new":
      // Start new signal
      ctx.session.flowStep = "master_selection";
      ctx.session.chartImage = undefined;
      ctx.session.lastPair = undefined;
      ctx.session.lastHolding = undefined;
      ctx.session.lastRisk = undefined;

      await ctx.reply(
        "Pilih Master AI yang ingin kamu gunakan:",
        {
          parse_mode: "Markdown",
          reply_markup: masterSelectionKeyboard,
        }
      );
      break;

    case "change_master":
      // Change master
      ctx.session.flowStep = "master_selection";
      ctx.session.chartImage = undefined;
      ctx.session.lastPair = undefined;
      ctx.session.lastHolding = undefined;
      ctx.session.lastRisk = undefined;
      ctx.session.master = undefined;

      await ctx.reply(
        "Pilih Master AI yang berbeda:",
        {
          parse_mode: "Markdown",
          reply_markup: masterSelectionKeyboard,
        }
      );
      break;

    case "details":
      await ctx.answerCallbackQuery({
        text: "📊 Lihat detail signal di atas",
        show_alert: true,
      });
      break;

    case "menu":
      ctx.session.flowStep = "idle";
      ctx.session.chartImage = undefined;

      await ctx.reply(
        "🤖 *Penasihat Trading Bot*\n\nPilih menu di bawah untuk mulai.",
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
      break;

    default:
      log.warn({ action }, "Unknown result action");
      break;
  }
}

async function handleLegacyAction(ctx: Context, value: string): Promise<void> {
  await ctx.answerCallbackQuery();

  switch (value) {
    case "signal":
      await ctx.reply(
        "Select a trading pair:",
        { parse_mode: "Markdown", reply_markup: tradingPairKeyboard }
      );
      break;

    case "chart":
      await ctx.reply(
        "📸 Please send a chart image for analysis",
        { parse_mode: "Markdown" }
      );
      break;

    case "help":
      await ctx.reply("/help to show help");
      break;

    case "details":
      await ctx.answerCallbackQuery({
        text: "See full signal details above",
        show_alert: true,
      });
      break;

    case "settings":
      await ctx.reply("⚙️ Settings coming soon...");
      break;

    default:
      log.warn({ value }, "Unknown legacy action");
      break;
  }
}

async function executeSignalCreation(
  ctx: Context,
  apiClient: TradingAPIClient,
  userId: string
): Promise<void> {
  const pair = ctx.session.lastPair;
  const holding = ctx.session.lastHolding;
  const risk = ctx.session.lastRisk;
  const chartImage = ctx.session.chartImage;
  const master = ctx.session.master;

  // Validate all parameters
  if (!pair || !holding || !risk) {
    const missing = [];
    if (!pair) missing.push("pair");
    if (!holding) missing.push("holding");
    if (!risk) missing.push("risk");
    
    log.warn({ pair, holding, risk, missing, flowStep: ctx.session.flowStep }, "Missing parameters");
    
    await ctx.answerCallbackQuery({
      text: `❌ Missing: ${missing.join(", ")}`,
      show_alert: true,
    });
    return;
  }

  ctx.session.flowStep = "processing";

  // Send processing message
  const processingMsg = await ctx.reply(
    formatProcessing(pair),
    { parse_mode: "Markdown" }
  );

  try {
    // Create signal
    const result = await apiClient.createSignal(userId, {
      pair: pair as string,
      holding: holding as "scalp" | "daily" | "swing" | "auto",
      risk: risk as "safe" | "growth" | "aggressive",
      imageBase64: chartImage,
    });

    const jobId = result.jobId;
    ctx.session.lastJobId = jobId;
    ctx.session.processingJobId = jobId;

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
        await ctx.api.deleteMessage(
          ctx.chat!.id,
          processingMsg.message_id
        );
      } catch (e) {
        // Ignore
      }

      // Send result
      ctx.session.flowStep = "result";
      const resultMessage = formatTradeSetup(signalResult, master);
      await ctx.reply(resultMessage, {
        parse_mode: "Markdown",
        reply_markup: resultActionsKeyboard,
      });

      // Clear session
      ctx.session.chartImage = undefined;

      log.info(
        { userId, pair, jobId, side: signalResult.setup?.side },
        "Signal completed"
      );
    } catch (pollError) {
      // Timeout - send job ID for later checking
      try {
        await ctx.api.deleteMessage(
          ctx.chat!.id,
          processingMsg.message_id
        );
      } catch (e) {
        // Ignore
      }

      await ctx.reply(
        `⏳ *Signal processing*\n\nJob ID: \`${jobId}\`\n\nUse /status ${jobId} to check later`,
        { parse_mode: "Markdown" }
      );

      ctx.session.chartImage = undefined;
      log.warn({ userId, jobId, error: pollError }, "Poll timeout");
    }
  } catch (apiError) {
    // Delete processing message
    try {
      await ctx.api.deleteMessage(
        ctx.chat!.id,
        processingMsg.message_id
      );
    } catch (e) {
      // Ignore
    }

    const errorMsg = formatError(
      apiError instanceof Error ? apiError : String(apiError)
    );

    await ctx.reply(errorMsg, {
      parse_mode: "Markdown",
      reply_markup: navigationKeyboard,
    });
    ctx.session.chartImage = undefined;

    log.error(
      { userId, pair, error: apiError },
      "Signal creation failed"
    );
  }

  await ctx.answerCallbackQuery();
}
