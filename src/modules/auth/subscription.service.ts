import { getDatabase } from "@/db/postgres";
import { subscriptions } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { createLogger } from "@/utils/logger";

const log = createLogger("SubscriptionService");

/**
 * Check if user has active subscription
 */
export async function checkSubscription(userId: string): Promise<boolean> {
  try {
    const db = getDatabase();

    log.debug(`Checking subscription for user ${userId}...`);

    const sub = await (db.query.subscriptions as any).findFirst({
      where: (subsTable: any, { eq: eqFunc, gt: gtFunc, and: andFunc }: any) =>
        andFunc(
          eqFunc(subsTable.userId, userId),
          eqFunc(subsTable.status, "active"),
          gtFunc(subsTable.expiresAt, new Date())
        ),
    });

    const result = !!sub;
    log.debug({ userId, hasSubscription: result }, "Subscription check completed");
    return result;
  } catch (error) {
    log.error({ userId, error }, "Failed to check subscription - returning true (bypass on error)");
    // Return true on error to not block user due to DB issues
    return true;
  }
}

/**
 * Get user subscription
 */
export async function getSubscription(userId: string) {
  try {
    const db = getDatabase();

    const sub = await (db.query.subscriptions as any).findFirst({
      where: (subsTable: any, { eq: eqFunc }: any) =>
        eqFunc(subsTable.userId, userId),
    });

    return sub;
  } catch (error) {
    log.error({ userId, error }, "Failed to get subscription");
    throw error;
  }
}
