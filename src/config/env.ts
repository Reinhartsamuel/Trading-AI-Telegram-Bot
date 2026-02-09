import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().url("Invalid database URL"),

  // Redis
  REDIS_URL: z.string().url("Invalid Redis URL").default("redis://localhost:6379"),

  // LLM
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  // APIs
  BINANCE_API_URL: z.string().url().default("https://api.binance.com/api/v3"),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  MAX_RETRIES: z.coerce.number().default(3),

  // Timeouts
  VISION_TIMEOUT_MS: z.coerce.number().default(30000),
  LLM_TIMEOUT_MS: z.coerce.number().default(45000),

  // Job processing
  JOB_QUEUE_NAME: z.string().default("signal-processing"),
  JOB_PROCESS_TIMEOUT_MS: z.coerce.number().default(120000),
  WORKER_CONCURRENCY: z.coerce.number().default(5),

  // Subscription
  SUBSCRIPTION_BYPASS: z.string().transform((v) => v === "true").default("true"),

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  TELEGRAM_POLLING_INTERVAL: z.coerce.number().default(5000),
  TELEGRAM_MAX_POLL_ATTEMPTS: z.coerce.number().default(30),
});

type Env = z.infer<typeof envSchema>;

let env: Env | null = null;

export function getEnv(): Env {
  if (!env) {
    try {
      env = envSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missing = error.errors.map((e) => e.path.join(".")).join(", ");
        throw new Error(`Environment validation failed: ${missing}`);
      }
      throw error;
    }
  }
  return env;
}

export const config = getEnv();
