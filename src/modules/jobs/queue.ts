import { getRedis } from "@/db/redis";
import { config } from "@/config/env";
import { createLogger } from "@/utils/logger";
import { randomUUID } from "crypto";

const log = createLogger("Queue");

export interface JobData {
  jobId: string;
  pair: string;
  holding: string;
  risk: string;
  imageBase64?: string;
  userId: string;
}

/**
 * Enqueue a job for processing
 */
export async function enqueueJob(data: JobData): Promise<string> {
  const redis = getRedis();
  const queueKey = config.JOB_QUEUE_NAME;

  try {
    // Store job metadata
    const jobKey = `job:${data.jobId}`;
    await redis.hset(jobKey, {
      id: data.jobId,
      pair: data.pair,
      holding: data.holding,
      risk: data.risk,
      userId: data.userId,
      status: "pending",
      createdAt: Date.now().toString(),
      ...(data.imageBase64 && { imageBase64: data.imageBase64 }),
    });

    // Set expiry (24 hours)
    await redis.expire(jobKey, 86400);

    // Add to queue
    await redis.lpush(queueKey, data.jobId);

    log.debug({ jobId: data.jobId, pair: data.pair }, "Job enqueued");
    return data.jobId;
  } catch (error) {
    log.error({ data, error }, "Failed to enqueue job");
    throw error;
  }
}

/**
 * Dequeue a job for processing
 */
export async function dequeueJob(): Promise<JobData | null> {
  const redis = getRedis();
  const queueKey = config.JOB_QUEUE_NAME;

  try {
    // Blocking pop with 30s timeout
    const jobId = await redis.brpop(queueKey, 30);

    if (!jobId) {
      return null;
    }

    const actualJobId = typeof jobId === "string" ? jobId : jobId[1];
    const job = await getJob(actualJobId);

    if (!job) {
      log.warn({ jobId: actualJobId }, "Job metadata not found");
      return null;
    }

    return job;
  } catch (error) {
    log.error({ error }, "Failed to dequeue job");
    throw error;
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<JobData | null> {
  const redis = getRedis();
  const jobKey = `job:${jobId}`;

  try {
    const data = await redis.hgetall(jobKey);

    if (Object.keys(data).length === 0) {
      return null;
    }

    return {
      jobId: data.id,
      pair: data.pair,
      holding: data.holding,
      risk: data.risk,
      userId: data.userId,
      imageBase64: data.imageBase64,
    };
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
): Promise<void> {
  const redis = getRedis();
  const jobKey = `job:${jobId}`;

  try {
    await redis.hset(jobKey, { status, updatedAt: Date.now().toString() });
    log.debug({ jobId, status }, "Job status updated");
  } catch (error) {
    log.error({ jobId, status, error }, "Failed to update job status");
    throw error;
  }
}

/**
 * Store job result
 */
export async function setJobResult(jobId: string, result: any): Promise<void> {
  const redis = getRedis();
  const jobKey = `job:${jobId}`;

  try {
    await redis.hset(jobKey, {
      result: JSON.stringify(result),
      status: "completed",
      completedAt: Date.now().toString(),
    });

    log.debug({ jobId }, "Job result stored");
  } catch (error) {
    log.error({ jobId, error }, "Failed to store job result");
    throw error;
  }
}

/**
 * Store job error
 */
export async function setJobError(jobId: string, error: any): Promise<void> {
  const redis = getRedis();
  const jobKey = `job:${jobId}`;

  try {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await redis.hset(jobKey, {
      error: errorMessage,
      status: "failed",
      completedAt: Date.now().toString(),
    });

    log.debug({ jobId, error: errorMessage }, "Job error stored");
  } catch (err) {
    log.error({ jobId, error: err }, "Failed to store job error");
    throw err;
  }
}

/**
 * Get job result
 */
export async function getJobResult(
  jobId: string
): Promise<{ status: string; result?: any; error?: string }> {
  const redis = getRedis();
  const jobKey = `job:${jobId}`;

  try {
    const data = await redis.hgetall(jobKey);

    if (Object.keys(data).length === 0) {
      return { status: "not_found" };
    }

    return {
      status: data.status,
      result: data.result ? JSON.parse(data.result) : undefined,
      error: data.error,
    };
  } catch (error) {
    log.error({ jobId, error }, "Failed to get job result");
    throw error;
  }
}

/**
 * Delete job
 */
export async function deleteJob(jobId: string): Promise<void> {
  const redis = getRedis();
  const jobKey = `job:${jobId}`;

  try {
    await redis.del(jobKey);
    log.debug({ jobId }, "Job deleted");
  } catch (error) {
    log.error({ jobId, error }, "Failed to delete job");
    throw error;
  }
}
