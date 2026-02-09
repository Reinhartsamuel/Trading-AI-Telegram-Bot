import { startTelegramBot } from "@/modules/telegram/bot";
import { initializeDatabase } from "@/db/postgres";
import { initializeRedis } from "@/db/redis";
import { createLogger } from "@/utils/logger";
import { config } from "@/config/env";

const log = createLogger("TelegramBotProcess");

async function main() {
  try {
    log.info("Initializing Telegram bot process...");

    // Validate bot token
    if (!config.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set");
    }

    log.info(`Bot token: ${config.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);

    // Initialize database
    log.info("Connecting to database...");
    await initializeDatabase();
    log.info("✓ Database connected");

    // Initialize Redis
    log.info("Connecting to Redis...");
    initializeRedis();
    log.info("✓ Redis initialized");

    // Start bot
    log.info("Starting Telegram bot...");
    startTelegramBot().catch((error: any) => {
      log.error({ error }, "Bot startup error");
      process.exit(1);
    });

    log.info("✓ Telegram bot process started");
  } catch (error) {
    log.error({ error }, "Fatal: Failed to initialize Telegram bot");
    console.error(error);
    process.exit(1);
  }
}

// Start the bot
main();

// Graceful shutdown
process.on("SIGINT", () => {
  log.info("Telegram bot shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log.info("Telegram bot shutting down (SIGTERM)...");
  process.exit(0);
});
