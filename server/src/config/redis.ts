import { Redis } from "ioredis";
import { config } from "./env.js";

export let isRedisConnected = false;
let redisClient: Redis | null = null;

export async function checkRedis(): Promise<{ connected: boolean; client: Redis | null }> {
  return new Promise((resolve) => {
    try {
      const client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: () => null, // don't auto-retry endlessly on failure
        lazyConnect: true,
      });

      client.on("error", () => {
        // Silently capture connection error when Redis is not running locally
      });

      client.connect()
        .then(() => {
          isRedisConnected = true;
          redisClient = client;
          console.log(`[Queue] Redis connected successfully on ${config.redisUrl}`);
          resolve({ connected: true, client });
        })
        .catch((err) => {
          isRedisConnected = false;
          redisClient = null;
          console.log(`[Queue] Redis not available (${err.message}). Using high-performance in-memory queue fallback.`);
          client.disconnect();
          resolve({ connected: false, client: null });
        });
    } catch {
      isRedisConnected = false;
      resolve({ connected: false, client: null });
    }
  });
}

export function getRedisClient(): Redis | null {
  return redisClient;
}
