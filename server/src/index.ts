import { app } from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { checkRedis } from "./config/redis.js";
import { seedDatabase } from "./utils/seedData.js";
import { initQueueSystem } from "./services/queueService.js";
import { startScheduler } from "./services/schedulerService.js";
import { startEmbeddedPostgres, migrateDatabase } from "./config/postgres.js";
import { prisma, checkPrismaConnection, startPrismaKeepAlive } from "./config/prismaClient.js";

async function bootstrap() {
  console.log("-----------------------------------------");
  console.log("   ⚡ Starting SendFlow Studio Backend ⚡   ");
  console.log("-----------------------------------------");

  // 1. PostgreSQL (embedded or external) + Prisma schema push
  try {
    await startEmbeddedPostgres();
    // Warm up Prisma connection immediately
    await prisma.$connect();
    await checkPrismaConnection();
    startPrismaKeepAlive();
    console.log("[Postgres] Prisma client connected & warm keep-alive active ✓");

    // Background schema check if needed (non-blocking for instant server startup)
    migrateDatabase().catch((err) => {
      console.warn("[Postgres] Background schema sync notice:", err.message);
    });
  } catch (err: any) {
    console.error("[Postgres] Notice: PostgreSQL startup:", err.message);
  }

  // 2. MongoDB Connection (for existing campaign/contact/template data)
  const mongoOk = await connectDB();
  if (mongoOk) {
    await seedDatabase();
  }

  // 3. Redis & Queue Initialization
  await checkRedis();
  await initQueueSystem();

  // 4. Scheduler Background Worker
  startScheduler();

  // 5. Start HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`[Server] SendFlow Studio API running at http://localhost:${config.port}`);
    console.log(`[Server] Auth API: http://localhost:${config.port}/api/auth/login`);
    console.log(`[Server] Health check: http://localhost:${config.port}/api/health`);
    console.log("-----------------------------------------");
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[Server] Notice: Port ${config.port} is already in use by another instance.`);
    } else {
      console.error("[Server] HTTP server error:", err);
    }
  });
}

bootstrap().catch((err) => {
  console.error("[Bootstrap] Fatal startup error:", err);
  process.exit(1);
});
