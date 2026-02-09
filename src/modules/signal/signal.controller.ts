import { Context } from "hono";
import { createSignalRequest, getSignalStatus, SignalRequest } from "./signal.service";
import { createLogger } from "@/utils/logger";

const log = createLogger("SignalController");

/**
 * POST /signal
 * Create a new signal request
 */
export async function createSignal(ctx: Context) {
  try {
    const userId = ctx.get("userId") || "default-user";
    const body = await ctx.req.json();

    const request: SignalRequest = {
      pair: body.pair,
      holding: body.holding,
      risk: body.risk,
      imageBase64: body.image_base64 || body.imageBase64,
    };

    const result = await createSignalRequest(userId, request);

    log.info({ userId, pair: request.pair }, "Signal created");
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
export async function getSignal(ctx: Context) {
  try {
    const jobId = ctx.req.param("jobId");

    if (!jobId) {
      return ctx.json({ error: "Job ID required" }, { status: 400 });
    }

    const result = await getSignalStatus(jobId);

    if (result.status === "not_found") {
      return ctx.json({ error: "Signal not found" }, { status: 404 });
    }

    log.debug({ jobId, status: result.status }, "Signal retrieved");
    return ctx.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get signal";
    log.error({ error }, message);

    return ctx.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /health
 * Health check
 */
export async function healthCheck(ctx: Context) {
  return ctx.json({ status: "ok" }, { status: 200 });
}
