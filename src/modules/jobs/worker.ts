import { initializeDatabase, getDatabase } from "@/db/postgres";
import { initializeRedis } from "@/db/redis";
import { dequeueJob, updateJobStatus, setJobResult, setJobError } from "./queue";
import { processSignal } from "./signal.processor";
import { signalJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/utils/logger";
import { config } from "@/config/env";

const log = createLogger("Worker");

/**
 * Initialize worker services
 */
async function initializeWorker() {
  log.info("Initializing worker...");

  try {
    await initializeDatabase();
    initializeRedis();
    log.info("✓ Worker initialized");
  } catch (error) {
    log.error({ error }, "Worker initialization failed");
    throw error;
  }
}

/**
 * Process a single job
 */
async function processJob(jobId: string) {
  try {
    const db = getDatabase();

    // Update job status to processing
    await updateJobStatus(jobId, "processing");

    // Update DB
    await db
      .update(signalJobs)
      .set({ status: "processing" })
      .where(eq(signalJobs.id, jobId));

    // Get job data
    const job = await db.query.signalJobs.findFirst({
      where: eq(signalJobs.id, jobId),
    });

    if (!job) {
    throw new Error(`Job not found: ${jobId}`);
    }

    // Process signal
    const result = await processSignal(
      jobId,
      job.pair,
      job.holding as any,
      job.risk as any,
      job.imageBase64 || undefined
    );

    // Store result
    await setJobResult(jobId, result);

    // Update DB
    await db
      .update(signalJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(signalJobs.id, jobId));

    log.info({ jobId, side: result.setup.side }, "Job completed successfully");
  } catch (error) {
    log.error({ jobId, error }, "Job processing failed");

    try {
      await setJobError(jobId, error);

      const db = getDatabase();
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db
        .update(signalJobs)
        .set({
          status: "failed",
          error: errorMessage,
          completedAt: new Date(),
        })
        .where(eq(signalJobs.id, jobId));
    } catch (err) {
      log.error({ jobId, error: err }, "Failed to save error to database");
    }
  }
}

/**
 * Main worker loop
 */
async function run() {
  await initializeWorker();

  log.info("Worker started, listening for jobs...");

  while (true) {
    try {
      const job = await dequeueJob();

      if (!job) {
        // Queue empty, wait before trying again
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      log.info({ jobId: job.jobId, pair: job.pair }, "Processing job");
      await processJob(job.jobId);
    } catch (error) {
      log.error({ error }, "Worker error");
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Start worker
run().catch((error) => {
  log.error({ error }, "Worker fatal error");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  log.info("Worker shutting down...");
  process.exit(0);
});
