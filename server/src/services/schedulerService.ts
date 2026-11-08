import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { ScheduledJob } from "../models/ScheduledJob.js";
import { memoryDb } from "../utils/memoryStore.js";
import { enqueueJob } from "./queueService.js";

let intervalId: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (intervalId) return;

  console.log("[Scheduler] Background scheduler loop started (checks every 20s)");

  // Check immediately on startup
  setTimeout(() => {
    checkDueSchedules().catch((e) => console.error("[Scheduler] Initial check error:", e.message));
  }, 3000);

  // Run periodic check every 20 seconds
  intervalId = setInterval(async () => {
    try {
      await checkDueSchedules();
    } catch (err: any) {
      console.error("[Scheduler] Error in checkDueSchedules:", err.message);
    }
  }, 20000);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function checkDueSchedules() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const localDateStr = `${year}-${month}-${day}`;
  const currentHours = String(now.getHours()).padStart(2, "0");
  const currentMinutes = String(now.getMinutes()).padStart(2, "0");
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  // 1. PostgreSQL via Prisma
  if (isPrismaConnected) {
    try {
      const dueJobs = await prisma.scheduledJob.findMany({
        where: {
          status: "scheduled",
          OR: [
            { scheduledAt: { lte: now } },
            { date: { lt: localDateStr } },
            { date: localDateStr, time: { lte: currentTimeStr } },
          ],
        },
      });

      for (const job of dueJobs) {
        console.log(`[Scheduler] Dispatching due PostgreSQL job: "${job.title}" (${job.id})`);
        // Atomic status lock to prevent duplicate pickup
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { status: "processing" },
        }).catch(() => null);

        await enqueueJob({
          type: "SCHEDULED_SEND",
          scheduledJobId: job.id,
        });
      }
      return;
    } catch (err: any) {
      console.error("[Scheduler] PostgreSQL check error:", err.message);
    }
  }

  // 2. MongoDB Fallback
  if (isMongoConnected) {
    try {
      const dueJobs = await ScheduledJob.find({
        status: "scheduled",
        $or: [
          { date: { $lt: localDateStr } },
          { date: localDateStr, time: { $lte: currentTimeStr } },
        ],
      });

      for (const job of dueJobs) {
        console.log(`[Scheduler] Dispatching due MongoDB job: ${job.title} (${job._id})`);
        await ScheduledJob.findByIdAndUpdate(job._id, { status: "processing" });
        await enqueueJob({
          type: "SCHEDULED_SEND",
          scheduledJobId: String(job._id),
        });
      }
      return;
    } catch (err: any) {
      console.error("[Scheduler] MongoDB check error:", err.message);
    }
  }

  // 3. In-Memory Fallback
  const all = await memoryDb.schedules.find({ status: "scheduled" });
  const dueJobs = all.filter((j: any) => {
    if (j.date < localDateStr) return true;
    if (j.date === localDateStr && j.time <= currentTimeStr) return true;
    return false;
  });

  for (const job of dueJobs) {
    await memoryDb.schedules.findByIdAndUpdate(job._id, { status: "processing" });
    await enqueueJob({
      type: "SCHEDULED_SEND",
      scheduledJobId: String(job._id),
    });
  }
}
