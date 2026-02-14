import { Context } from "../types";
import { getOrCreateUser } from "@/modules/user/user.service";
import { createLogger } from "@/utils/logger";

const log = createLogger("UserMiddleware");

/**
 * Middleware that ensures user exists in database
 * Creates new user if they don't exist
 * Attaches user data to context
 */
export async function userMiddleware(ctx: Context, next: () => Promise<void>) {
  try {
    const telegramId = ctx.from?.id?.toString();

    if (!telegramId) {
      log.warn("Message without telegram ID, skipping user check");
      return await next();
    }

    // Get or create user
    const user = await getOrCreateUser(telegramId);

    // Attach user data to context for use in handlers
    ctx.userData = user;

    log.debug(
      { telegramId, userId: user.id },
      "User verified/created, proceeding to handler"
    );

    await next();
  } catch (error) {
    log.error({ error }, "User middleware error");

    // Try to notify user about the error
    try {
      await ctx.reply(
        "❌ Database error. Please try again in a moment.",
        { parse_mode: "Markdown" }
      );
    } catch (replyError) {
      log.error({ replyError }, "Failed to send error message to user");
    }
  }
}
