import { Context } from "hono";
import { createSignalRequest, getSignalStatus, SignalRequest } from "./signal.service";
import { createLogger } from "@/utils/logger";
    import { getDatabase } from "@/db/postgres";
import { orders } from "@/db/schema";
const log = createLogger("SignalController");

/**
 * POST /signal
 * Create a new signal request
 */
export async function createOrder(ctx: Context) {
  try {
    const body = await ctx.req.json();

    const db = getDatabase();
    console.log(`creating new order`)

    // create new order to database
    const result = await db.insert(orders).values({
      // userId:body.telegramId,
      telegramId:body.telegramId,
      plan:body.plan,
      submissionId:'testsubmissionid',
    }).returning();

    return ctx.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create signal";
    log.error({ error }, message);

    return ctx.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("Validation") ? 400 : 500 }
    );
  }
}

/**
 * GET /signal/:jobId
 * Get signal status and result
 */
export async function getOrder(ctx: Context) {
  try {
    const orderId = ctx.req.param("orderId");
    const db = getDatabase();
    if (!orderId) {
      return ctx.json({ error: "Order ID required" }, { status: 400 });
    }

    const result = await db.query.orders.findFirst({
      where: (orders, { eq }) => eq(orders.id, orderId),
    });

    return ctx.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get signal";
    log.error({ error }, message);

    return ctx.json({ error: message }, { status: 500 });
  }
}
