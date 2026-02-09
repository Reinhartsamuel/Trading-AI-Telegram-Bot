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

    // Initialize database (for future user storage)
    log.info("Connecting to database...");
    await initializeDatabase();

    // Initialize Redis (for rate limiting, sessions)
    log.info("Connecting to Redis...");
    initializeRedis();

    // Start bot
    log.info("Starting Telegram bot...");
    await startTelegramBot();

    log.info("✓ Telegram bot process started successfully");
  } catch (error) {
    log.error({ error }, "Failed to start Telegram bot");
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
