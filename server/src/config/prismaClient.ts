import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// DATABASE_URL connection pool tuning — append pool params if not already present
const rawUrl = process.env.DATABASE_URL || "";
const pooledUrl = rawUrl && !rawUrl.includes("connection_limit")
  ? rawUrl + (rawUrl.includes("?") ? "&" : "?") + "connection_limit=5&pool_timeout=10&connect_timeout=10"
  : rawUrl;

if (pooledUrl !== rawUrl) {
  process.env.DATABASE_URL = pooledUrl;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export let isPrismaConnected = false;

export async function checkPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPrismaConnected = true;
    return true;
  } catch (err: any) {
    isPrismaConnected = false;
    return false;
  }
}
