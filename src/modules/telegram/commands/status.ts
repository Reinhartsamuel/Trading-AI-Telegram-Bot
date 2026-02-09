import { Context } from "../types";
import { TradingAPIClient } from "../api-client";
import {
  formatSignalStatus,
  formatInterpretation,
  formatError,
} from "../formatters/signal";
import { resultActionsKeyboard } from "../keyboards";
import { createLogger } from "@/utils/logger";

const log = createLogger("StatusCommand");

export async function handleStatusCommand(
  ctx: Context,
  apiClient: TradingAPIClient
) {
  try {
    const userId = String(ctx.from?.id || "anonymous");
    const jobId = ctx.match?.toString().trim();

    // If no jobId provided, use last one from session
    const id = jobId || ctx.session.lastJobId;

    if (!id) {
      await ctx.reply(
        `❌ *No job ID provided*\n\nUsage: /status <jobId>\n\nOr upload a chart to start a new signal.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    try {
      const result = await apiClient.getSignalStatus(userId, id);

      const statusMessage = formatSignalStatus(result);
      let message = statusMessage;

      // Add interpretation if available
      if (result.status === "completed" && result.interpretation) {
        message += `\n\n` + formatInterpretation(result);
      }

      const buttons =
        result.status === "completed" ? resultActionsKeyboard : undefined;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: buttons,
      });

      log.info(
        { userId, jobId: id, status: result.status },
        "Status checked"
      );
    } catch (apiError) {
      const errorMsg = formatError(apiError instanceof Error ? apiError : String(apiError));
      await ctx.reply(errorMsg, { parse_mode: "Markdown" });

      log.error({ userId, jobId: id, error: apiError }, "Status check failed");
    }
  } catch (error) {
    log.error({ error }, "Status command failed");
    await ctx.reply("❌ Command failed. Please try again.", {
      parse_mode: "Markdown",
    });
  }
}
