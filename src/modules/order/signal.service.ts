import { z } from "zod";
import { createJob, getJob } from "./signal.repository";
import { enqueueJob } from "@/modules/jobs/queue";
import { createLogger } from "@/utils/logger";
import { randomUUID } from "crypto";

const log = createLogger("SignalService");

// Validation schema
const SignalRequestSchema = z.object({
  pair: z.string().min(1).max(20),
  holding: z.enum(["scalp", "daily", "swing", "auto"]),
  risk: z.enum(["safe", "growth", "aggressive"]),
  imageBase64: z.string().optional(),
});

export type SignalRequest = z.infer<typeof SignalRequestSchema>;

/**
 * Create a new signal request
 */
export async function createSignalRequest(
  userId: string,
  request: SignalRequest
): Promise<{ jobId: string }> {
  try {
    // Validate input
    const validated = SignalRequestSchema.parse(request);

    // Create job record in DB
    const job = await createJob({
      userId,
      pair: validated.pair,
      holding: validated.holding,
      risk: validated.risk,
      imageBase64: validated.imageBase64,
    });

    // Enqueue for processing
    await enqueueJob({
      jobId: job.id,
      pair: validated.pair,
      holding: validated.holding,
      risk: validated.risk,
      imageBase64: validated.imageBase64,
      userId,
    });

    log.info(
      { jobId: job.id, pair: validated.pair },
      "Signal request created and enqueued"
    );

    return { jobId: job.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn({ error: error.errors }, "Validation error");
      throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
    }
    log.error({ userId, error }, "Failed to create signal request");
    throw error;
  }
}

/**
 * Get signal status and result
 */
export async function getSignalStatus(jobId: string): Promise<any> {
  try {
    const job = await getJob(jobId);

    if (!job) {
      return {
        status: "not_found",
        jobId,
      };
    }

    const result: any = {
      jobId,
      status: job.status,
      pair: job.pair,
      holding: job.holding,
      risk: job.risk,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };

    if (job.results && job.results.length > 0) {
      const signalResult = job.results[0];
      result.setup = {
        side: signalResult.side,
        entry: signalResult.entry ? parseFloat(signalResult.entry) : null,
        stopLoss: signalResult.stopLoss ? parseFloat(signalResult.stopLoss) : null,
        takeProfits: JSON.parse(signalResult.takeProfits || "[]"),
        riskReward: signalResult.riskReward ? parseFloat(signalResult.riskReward) : null,
        confidence: signalResult.confidence ? parseFloat(signalResult.confidence) : null,
        reason: signalResult.reason,
      };

      if (signalResult.marketInterpretation) {
        result.interpretation = signalResult.marketInterpretation;
      }
    }

    if (job.error) {
      result.error = job.error;
    }

    log.debug({ jobId, status: job.status }, "Retrieved signal status");
    return result;
  } catch (error) {
    log.error({ jobId, error }, "Failed to get signal status");
    throw error;
  }
}
