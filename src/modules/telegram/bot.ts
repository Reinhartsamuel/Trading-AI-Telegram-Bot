import { Bot, session, webhookCallback } from "grammy";
import { Hono } from "hono";
import { config } from "@/config/env";
import { createLogger } from "@/utils/logger";
import { TradingAPIClient } from "./api-client";
import { Context } from "./types";

// Commands
import { handleStartCommand } from "./commands/start";
import { handleSignalCommand } from "./commands/signal";
import { handleStatusCommand } from "./commands/status";
import { handleHelpCommand } from "./commands/help";
import { handleSettingsCommand } from "./commands/settings";

// Handlers
import { handlePhotoCommand } from "./handlers/photo";
import { handleCallbackQuery } from "./handlers/callback";
import { handleTickerInput, handleGeneralText } from "./handlers/text";

// Middleware
import { userMiddleware } from "./middleware/user.middleware";

const log = createLogger("TelegramBot");

export async function initializeTelegramBot() {
  if (!config.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN not configured");
  }

  const bot = new Bot<Context>(
    config.TELEGRAM_BOT_TOKEN
  );

  // Session middleware
  bot.use(
    session({
      initial: () => ({}),
    })
  );

  // Initialize API client
  const apiClient = new TradingAPIClient(config.API_BASE_URL);

  // User middleware - ensure user exists in database
  bot.use(userMiddleware);

  // Middleware for logging
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const userName = ctx.from?.username;
    log.debug({ userId, userName }, "Incoming message");
    await next();
  });

  // Commands
  bot.command("start", handleStartCommand);
  bot.command("help", handleHelpCommand);
  bot.command(
    "signal",
    (ctx) => handleSignalCommand(ctx, apiClient)
  );
  bot.command(
    "status",
    (ctx) => handleStatusCommand(ctx, apiClient)
  );
  bot.command("settings", handleSettingsCommand);

  // Handlers
  bot.on("message:photo", handlePhotoCommand);
  bot.on("message:text", async (ctx) => {
    // Handle ticker input or general text
    await handleTickerInput(ctx);
    if (ctx.session.flowStep !== "ticker_input") {
      await handleGeneralText(ctx);
    }
  });
  bot.on("callback_query:data", (ctx) =>
    handleCallbackQuery(ctx, apiClient)
  );

  // Error handler
  bot.catch((err) => {
    const error = err.error;
    const ctx = err.ctx;

    log.error(
      { error, userId: ctx.from?.id },
      "Bot error"
    );

    // Try to notify user
    try {
      ctx.reply("❌ An error occurred. Please try again later.", {
        parse_mode: "Markdown",
      }).catch(() => {
        // Silently ignore reply errors
      });
    } catch (e) {
      // Silently ignore
    }
  });

  return bot;
}

let botInstance: Bot<Context> | null = null;

export async function startTelegramBot(): Promise<void> {
  try {
    botInstance = await initializeTelegramBot();

    log.info("Starting Telegram bot (polling mode)...");

    // Use polling mode
    botInstance.start({
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
      onStart: (botInfo) => {
        log.info({ botId: botInfo.id, username: botInfo.username }, "✓ Telegram bot started successfully");
        log.info(`Bot @${botInfo.username} is listening for updates...`);
      },
    }).catch((error: any) => {
      log.error({ error: String(error) }, "Bot polling error - restarting");
      // Restart polling after delay
      setTimeout(() => {
        log.info("Attempting to restart bot polling...");
        startTelegramBot().catch((e) => {
          log.error({ error: e }, "Failed to restart bot");
        });
      }, 5000);
    });
  } catch (error) {
    log.error({ error }, "Failed to initialize Telegram bot");
    throw error;
  }
}

export async function sendNotification(
  userId: number,
  message: string,
  options?: { parse_mode?: "Markdown" | "HTML" }
) {
  const botInstance = await initializeTelegramBot();
  return await botInstance.api.sendMessage(userId, message, options);
}

export function getTelegramBot(): Bot<Context> {
  if (!botInstance) {
    throw new Error("Bot not initialized. Call startTelegramBot() first.");
  }
  return botInstance;
}
