import { Context } from "../types";
import { quickActionsKeyboard } from "../keyboards";
import { createLogger } from "@/utils/logger";

const log = createLogger("StartCommand");

export async function handleStartCommand(ctx: Context) {
  try {
    const userId = ctx.from?.id;
    const userData = ctx.userData;

    log.info(
      {
        telegramId: userId,
        userId: userData?.id,
        isNewUser: userData ? true : false
      },
      "User started bot"
    );

    const message = `
👋 *Welcome to Trading Signal Bot!*

This bot generates crypto trading signals using AI-powered market analysis.

*Available Commands:*
/signal - Create a new trading signal
/status <jobId> - Check signal status
/help - Show help
/settings - Bot settings

*How it works:*
1️⃣ Send /signal with pair, strategy, and risk level
2️⃣ Optionally upload a chart for technical analysis
3️⃣ Get a complete trade setup with entry, stops, and targets
4️⃣ Manage your signals with /status

*Example:*
\`/signal BTCUSDT scalp growth\`

Tap a button below to get started:
    `;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: quickActionsKeyboard,
    });
  } catch (error) {
    log.error({ error }, "Start command failed");
    await ctx.reply("❌ Failed to process command");
  }
}
