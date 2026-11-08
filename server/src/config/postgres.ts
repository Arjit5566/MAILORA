import EmbeddedPostgresPkg from "embedded-postgres";
import path from "path";
import fs from "fs";
import net from "net";
import { execSync } from "child_process";
import { config } from "./env.js";

const EmbeddedPostgres = (EmbeddedPostgresPkg as any).default || EmbeddedPostgresPkg;

let pgInstance: any = null;

function isPortOpen(port: number, host: string = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function startEmbeddedPostgres(): Promise<void> {
  const dbUrl = config.databaseUrl;
  const isLocalhost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

  if (!isLocalhost) {
    console.log("[Postgres] Using remote DATABASE_URL — skipping local embedded launcher.");
    return;
  }

  // Check if PostgreSQL or another service is already active on port 5432
  const alreadyListening = await isPortOpen(5432);
  if (alreadyListening) {
    console.log("[Postgres] PostgreSQL service already active on port 5432 ✓");
    return;
  }

  const dataDir = path.resolve(process.cwd().endsWith("server") ? process.cwd() : path.join(process.cwd(), "server"), "data/db");
  const pidFile = path.join(dataDir, "postmaster.pid");

  // Clean up stale postmaster.pid if process is dead
  if (fs.existsSync(pidFile)) {
    try {
      const pidContent = fs.readFileSync(pidFile, "utf-8").split("\n")[0]?.trim();
      const pid = parseInt(pidContent || "0", 10);
      let isAlive = false;
      if (pid > 0) {
        try {
          process.kill(pid, 0);
          isAlive = true;
        } catch {
          isAlive = false;
        }
      }
      if (!isAlive) {
        console.log("[Postgres] Cleaning up stale postmaster.pid from PID", pid);
        fs.unlinkSync(pidFile);
      }
    } catch {
      // Ignore
    }
  }

  try {
    pgInstance = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "postgres",
      password: "password",
      port: 5432,
      persistent: true,
    });

    try {
      await pgInstance.initialise();
    } catch {
      // Already initialized
    }

    await pgInstance.start();
    console.log("[Postgres] PostgreSQL engine running on port 5432 ✓");
  } catch (err: any) {
    if (err.message?.includes("already running") || err.message?.includes("EADDRINUSE")) {
      console.log("[Postgres] PostgreSQL service already active on port 5432 ✓");
    } else {
      console.warn("[Postgres] Notice: Embedded PostgreSQL startup:", err.message);
    }
  }
}

export async function migrateDatabase(): Promise<void> {
  try {
    const cwd = process.cwd().endsWith("server") ? process.cwd() : path.join(process.cwd(), "server");
    execSync("npx prisma db push --schema=prisma/schema.prisma --accept-data-loss", {
      stdio: "pipe",
      cwd,
      env: { ...process.env, DATABASE_URL: config.databaseUrl },
    });
    console.log("[Postgres] Prisma schema synced with PostgreSQL ✓");
  } catch (err: any) {
    console.warn("[Postgres] Schema sync notice:", err.message?.slice(0, 150));
  }
}

export async function stopEmbeddedPostgres(): Promise<void> {
  if (pgInstance) {
    try {
      await pgInstance.stop();
      console.log("[Postgres] Embedded PostgreSQL stopped");
    } catch {
      // ignore
    }
  }
}
