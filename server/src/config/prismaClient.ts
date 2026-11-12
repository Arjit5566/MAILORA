import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// DATABASE_URL connection pool tuning — automatically resolve IPv4 pooler and apply optimal pool settings
function resolveDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let url = rawUrl;

  // Permanent safeguard: Rewrite direct Supabase IPv6-only hostname (db.oypoblxdgiarjtykkkml.supabase.co)
  // to the official AWS IPv4 Session Pooler host for region ap-northeast-1:
  if (url.includes("db.oypoblxdgiarjtykkkml.supabase.co")) {
    url = url.replace("db.oypoblxdgiarjtykkkml.supabase.co", "aws-0-ap-northeast-1.pooler.supabase.com");
    url = url.replace("postgres:AJJU123", "postgres.oypoblxdgiarjtykkkml:AJJU123");
  }

  // Ensure connection pool settings are tuned for low latency and warm connection reuse
  if (!url.includes("connection_limit")) {
    url += (url.includes("?") ? "&" : "?") + "connection_limit=10&pool_timeout=15&connect_timeout=10";
  }
  return url;
}

const targetUrl = resolveDatabaseUrl(process.env.DATABASE_URL || "");
if (targetUrl && targetUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = targetUrl;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: targetUrl,
      },
    },
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

// Keep connection pool permanently warm and alive so idle timeouts never cause slow logins
let keepAliveTimer: NodeJS.Timeout | null = null;

export function startPrismaKeepAlive() {
  if (keepAliveTimer) return;
  // Ping PostgreSQL every 45 seconds to keep TCP / TLS connections alive in the pool
  keepAliveTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      isPrismaConnected = true;
    } catch {
      isPrismaConnected = false;
    }
  }, 45000);
  keepAliveTimer.unref(); // Ensure timer does not prevent clean process exit
}
