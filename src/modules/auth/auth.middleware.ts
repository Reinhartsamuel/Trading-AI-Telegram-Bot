import { Context, Next } from "hono";
import { config } from "@/config/env";
import { checkSubscription } from "./subscription.service";
import { createLogger } from "@/utils/logger";
import { getRedis } from "@/db/redis";

const log = createLogger("AuthMiddleware");
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per minute

/**
 * Rate limiting middleware using Redis sliding window
 */
async function rateLimitMiddleware(ctx: Context, next: Next) {
  const userId = ctx.get("userId") || ctx.req.header("x-user-id") || "anonymous";
  const key = `rate-limit:${userId}`;
  const redis = getRedis();

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    if (current > RATE_LIMIT_MAX) {
      return ctx.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    ctx.set("rateLimitRemaining", String(RATE_LIMIT_MAX - current));
    await next();
  } catch (error) {
    log.error({ userId, error }, "Rate limit check failed");
    await next();
  }
}

/**
 * Authentication middleware - validates user subscription
 * Currently bypassed via SUBSCRIPTION_BYPASS config
 */
async function authMiddleware(ctx: Context, next: Next) {
  // Extract user ID from header or JWT in future
  const userId = ctx.req.header("x-user-id") || "default-user";

  // TODO: Parse JWT and extract real user ID
  ctx.set("userId", userId);

  // Check subscription (can be bypassed via config)
  if (config.SUBSCRIPTION_BYPASS) {
    log.debug({ userId }, "✓ Subscription check BYPASSED (SUBSCRIPTION_BYPASS enabled)");
    await next();
    return;
  }

  // If not bypassed, check actual subscription
  const hasSubscription = await checkSubscription(userId);
  if (!hasSubscription) {
    log.warn({ userId }, "✗ User has no active subscription");
    return ctx.json(
      { error: "No active subscription" },
      { status: 403 }
    );
  }

  log.debug({ userId }, "✓ User has active subscription");
  await next();
}

export { authMiddleware, rateLimitMiddleware };
