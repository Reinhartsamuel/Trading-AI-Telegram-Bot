import { getDatabase } from "@/db/postgres";
import { signalJobs, signalResults, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/utils/logger";
import { randomUUID } from "crypto";

const log = createLogger("SignalRepository");

export interface CreateJobInput {
  userId: string;
  pair: string;
  holding: string;
  risk: string;
  imageBase64?: string;
}

/**
 * Create a new signal job
 */
export async function createJob(input: CreateJobInput) {
  try {
    const db = getDatabase();
    const jobId = randomUUID();

    // Ensure user exists
    await ensureUserExists(input.userId);

    const result = await db
      .insert(signalJobs)
      .values({
        id: jobId,
        userId: input.userId,
        pair: input.pair,
        holding: input.holding,
        risk: input.risk,
        imageBase64: input.imageBase64,
        status: "pending",
      })
      .returning();

    log.debug({ jobId, pair: input.pair }, "Job created");
    return result[0];
  } catch (error) {
    log.error({ input, error }, "Failed to create job");
    throw error;
  }
}

/**
 * Ensure user exists in database
 */
async function ensureUserExists(userId: string): Promise<void> {
  try {
    const db = getDatabase();

    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existing) {
      // Create new user record
      await db.insert(users).values({
        id: userId,
      });
      log.debug({ userId }, "New user created");
    }
  } catch (error) {
    log.error({ userId, error }, "Failed to ensure user exists");
    throw error;
  }
}

/**
 * Get job with its result
 */
export async function getJob(jobId: string) {
  try {
    const db = getDatabase();

    const job = await db.query.signalJobs.findFirst({
      where: eq(signalJobs.id, jobId),
      with: {
        results: true,
      },
    });

    return job;
  } catch (error) {
    log.error({ jobId, error }, "Failed to get job");
    throw error;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: "pending" | "processing" | "completed" | "failed"
) {
  try {
    const db = getDatabase();

    const result = await db
      .update(signalJobs)
      .set({ status })
      .where(eq(signalJobs.id, jobId))
      .returning();

    log.debug({ jobId, status }, "Job status updated");
    return result[0];
  } catch (error) {
    log.error({ jobId, status, error }, "Failed to update job status");
    throw error;
  }
}

/**
 * Save signal result
 */
export async function saveResult(
  jobId: string,
  side: string,
  entry: number | null,
  stopLoss: number | null,
  takeProfits: number[],
  riskReward: number,
  confidence: number,
  metadata: any
) {
  try {
    const db = getDatabase();

    const result = await db
      .insert(signalResults)
      .values({
        jobId,
        side,
        entry: entry?.toString(),
        stopLoss: stopLoss?.toString(),
        takeProfits: JSON.stringify(takeProfits),
        riskReward: riskReward?.toString(),
        confidence: confidence?.toString(),
        reason: metadata.reason,
        marketInterpretation: metadata.interpretation,
        visionAnalysis: metadata.vision,
        metrics: metadata.metrics,
      })
      .returning();

    log.debug({ jobId, side }, "Result saved");
    return result[0];
  } catch (error) {
    log.error({ jobId, error }, "Failed to save result");
    throw error;
  }
}

/**
 * Get recent jobs for a user
 */
export async function getUserJobs(userId: string, limit: number = 10) {
  try {
    const db = getDatabase();

    return await db.query.signalJobs.findMany({
      where: eq(signalJobs.userId, userId),
      limit,
      with: {
        results: true,
      },
    });
  } catch (error) {
    log.error({ userId, error }, "Failed to get user jobs");
    throw error;
  }
}
