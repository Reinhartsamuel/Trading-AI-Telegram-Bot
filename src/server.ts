import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as pinoLogger } from "@/utils/logger";
import { createLogger } from "@/utils/logger";
import { config } from "@/config/env";
import { initializeDatabase } from "@/db/postgres";
import { initializeRedis } from "@/db/redis";
import {
  createSignal,
  getSignal,
  healthCheck,
} from "@/modules/signal/signal.controller";
import {
  createOrder
} from "@/modules/order/order.controller";
import { authMiddleware, rateLimitMiddleware } from "@/modules/auth/auth.middleware";

const log = createLogger("Server");

// Create Hono app
const app = new Hono();

// Middleware
app.use(cors());

// Request logging middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  log.info({
    method: ctx.req.method,
    path: ctx.req.path,
    status: ctx.res.status,
    duration,
  });
});

// Apply auth and rate limit middleware
app.use(authMiddleware);
app.use(rateLimitMiddleware);

// Routes
app.get("/health", healthCheck);
app.post("/signal", createSignal);
app.get("/signal/:jobId", getSignal);
app.post("/order",createOrder)
// app.post("/webhook-orderonline", )

// 404 handler
app.notFound((ctx) => {
  return ctx.json({ error: "Not found" }, { status: 404 });
});

// Error handler
app.onError((error, ctx) => {
  log.error({ error }, "Unhandled error");
  return ctx.json(
    {
      error: error instanceof Error ? error.message : "Internal server error",
    },
    { status: 500 }
  );
});

/**
 * Initialize server
 */
async function initialize() {
  try {
    log.info("Initializing server...");

    // Initialize database and Redis
    await initializeDatabase();
    initializeRedis();

    log.info("✓ Server initialized");
  } catch (error) {
    log.error({ error }, "Server initialization failed");
    throw error;
  }
}

/**
 * Start server
 */
async function start() {
  try {
    await initialize();

    const port = config.PORT;
    log.info({ port }, "Starting server");

    const server = Bun.serve({
      fetch: app.fetch,
      port,
    });

    log.info({ port }, "Server running");
    log.info("Health check: GET http://localhost:" + port + "/health");
    log.info("Create signal: POST http://localhost:" + port + "/signal");
    log.info("Get signal: GET http://localhost:" + port + "/signal/{jobId}");
  } catch (error) {
    log.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

// Start if running directly
if (import.meta.main) {
  start().catch((error) => {
    log.error({ error }, "Fatal error");
    process.exit(1);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  log.info("Server shutting down...");
  process.exit(0);
});
