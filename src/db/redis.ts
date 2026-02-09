import Redis from "ioredis";
import { config } from "@/config/env";

let redis: Redis | null = null;

export function initializeRedis(): Redis {
  if (redis) return redis;

  redis = new Redis(config.REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on("connect", () => {
    console.log("✓ Redis connected");
  });

  redis.on("error", (error) => {
    console.error("✗ Redis error:", error);
  });

  return redis;
}

export function getRedis(): Redis {
  if (!redis) {
    return initializeRedis();
  }
  return redis;
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log("✓ Redis disconnected");
  }
}
