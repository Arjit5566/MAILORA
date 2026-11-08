import { Router, Request, Response } from "express";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { ScheduledJob } from "../models/ScheduledJob.js";
import { memoryDb } from "../utils/memoryStore.js";
import { enqueueJob } from "../services/queueService.js";
import { getAuthUserId, mapWithUnderscoreId, formatWithUnderscoreId } from "../utils/authHelper.js";

const router = Router();

// 1. GET all schedules
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);

    if (isPrismaConnected) {
      const list = await prisma.scheduledJob.findMany({
        where: { userId },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      });
      return res.json(mapWithUnderscoreId(list));
    }

    if (isMongoConnected) {
      const schedules = await ScheduledJob.find().sort({ date: 1, time: 1 });
      return res.json(schedules);
    }

    const schedules = await memoryDb.schedules.find();
    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST create and schedule a new send
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const {
      title,
      subject,
      html,
      date,
      time,
      timezone = "UTC",
      recipients = [],
      recipientIds = [],
      manualEmails = [],
      audience,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Campaign title is required" });
    }
    if (!date || !time) {
      return res.status(400).json({ error: "Scheduled date and time are required" });
    }

    // Parse target date and validate against past scheduling
    const [y, m, d] = String(date).split("-").map(Number);
    const timeParts = String(time).trim().split(":");
    let hours = parseInt(timeParts[0] || "0", 10);
    let minutes = parseInt(timeParts[1] || "0", 10);
    let targetDateObj = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, hours, minutes, 0, 0);

    if (isNaN(targetDateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date or time format" });
    }

    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth() + 1;
    const todayD = now.getDate();
    const isToday = (y === todayY && m === todayM && d === todayD);

    if (isToday) {
      // 1. If 12-hour format was typed (e.g., 5:00 or 6:00 AM) and is in the past, convert to PM (17:00 or 18:00)
      if (hours < 12 && targetDateObj.getTime() < now.getTime()) {
        const pmCandidate = new Date(y, m - 1, d, hours + 12, minutes, 0, 0);
        if (pmCandidate.getTime() > now.getTime()) {
          hours += 12;
          targetDateObj = pmCandidate;
        }
      }

      // 2. If time is still in the past or right now, schedule to dispatch in 1 minute today instead of rejecting
      if (targetDateObj.getTime() <= now.getTime()) {
        targetDateObj = new Date(now.getTime() + 60 * 1000);
        hours = targetDateObj.getHours();
        minutes = targetDateObj.getMinutes();
      }
    } else {
      // For earlier calendar dates, check if strictly before today
      const targetEndOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
      if (targetEndOfDay.getTime() < now.getTime()) {
        return res.status(400).json({ error: "Cannot schedule an email for a past date. Please pick today or a future date." });
      }
    }

    const normalizedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    // Resolve explicit recipient targets
    const resolvedRecipients: Array<{ email: string; name?: string; company?: string }> = [];
    const seen = new Set<string>();

    // A. Explicit recipient objects (handles array or stringified JSON)
    let rawRecipients = recipients;
    if (typeof rawRecipients === "string") {
      try {
        rawRecipients = JSON.parse(rawRecipients);
      } catch {
        rawRecipients = [];
      }
    }
    if (Array.isArray(rawRecipients) && rawRecipients.length > 0) {
      rawRecipients.forEach((r: any) => {
        const em = String((typeof r === "object" ? r.email : r) || "").trim().toLowerCase();
        if (em.includes("@") && !seen.has(em)) {
          seen.add(em);
          resolvedRecipients.push({
            email: em,
            name: (typeof r === "object" && r.name) ? r.name : em.split("@")[0] || "Recipient",
            company: typeof r === "object" ? r.company : undefined,
          });
        }
      });
    }

    // B. From Contact IDs
    if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      if (isPrismaConnected) {
        const found = await prisma.contact.findMany({
          where: { userId, id: { in: recipientIds } },
        });
        found.forEach((c) => {
          const em = c.email.toLowerCase().trim();
          if (!seen.has(em)) {
            seen.add(em);
            resolvedRecipients.push({
              email: em,
              name: c.name || em.split("@")[0],
              company: c.company || undefined,
            });
          }
        });
      }
    }

    // C. From manual email strings
    if (Array.isArray(manualEmails)) {
      manualEmails.forEach((raw: string) => {
        const em = String(raw || "").trim().toLowerCase();
        if (em.includes("@") && !seen.has(em)) {
          seen.add(em);
          resolvedRecipients.push({
            email: em,
            name: em.split("@")[0] || "Recipient",
          });
        }
      });
    }

    const computedAudience =
      resolvedRecipients.length > 0
        ? `${resolvedRecipients.length} selected recipient(s)`
        : audience || "All subscribers";

    const payload = {
      title: title.trim(),
      subject: (subject || title).trim(),
      html: html || "<p>Hello {{name}}, this is your scheduled message.</p>",
      date,
      time,
      timezone,
      audience: computedAudience,
      recipients: resolvedRecipients.length > 0 ? JSON.stringify(resolvedRecipients) : null,
      status: "scheduled",
      scheduledAt: targetDateObj,
    };

    if (isPrismaConnected) {
      const created = await prisma.scheduledJob.create({
        data: {
          userId,
          ...payload,
        },
      });

      const delayMs = targetDateObj.getTime() - now.getTime();
      if (delayMs > 0) {
        await enqueueJob(
          { type: "SCHEDULED_SEND", scheduledJobId: created.id },
          delayMs,
          `sched-${created.id}`
        );
      }

      return res.status(201).json(formatWithUnderscoreId(created));
    }

    // Fallback MongoDB / Memory
    let created: any;
    if (isMongoConnected) {
      created = await ScheduledJob.create(payload);
    } else {
      created = await memoryDb.schedules.create(payload);
    }

    const delayMs = targetDateObj.getTime() - now.getTime();
    if (delayMs > 0) {
      await enqueueJob(
        { type: "SCHEDULED_SEND", scheduledJobId: String(created._id) },
        delayMs,
        `sched-${created._id}`
      );
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT edit / reschedule existing job
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { id } = req.params;
    const { title, subject, html, date, time, timezone, recipients, audience } = req.body;

    let targetDateObj: Date | undefined;
    let normalizedTime: string | undefined;
    if (date && time) {
      const [y, m, d] = String(date).split("-").map(Number);
      const timeParts = String(time).trim().split(":");
      let hours = parseInt(timeParts[0] || "0", 10);
      let minutes = parseInt(timeParts[1] || "0", 10);
      targetDateObj = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, hours, minutes, 0, 0);

      const now = new Date();
      const isToday = (y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate());
      if (isToday) {
        if (hours < 12 && targetDateObj.getTime() < now.getTime()) {
          const pmCandidate = new Date(y, m - 1, d, hours + 12, minutes, 0, 0);
          if (pmCandidate.getTime() > now.getTime()) {
            hours += 12;
            targetDateObj = pmCandidate;
          }
        }
        if (targetDateObj.getTime() <= now.getTime()) {
          targetDateObj = new Date(now.getTime() + 60 * 1000);
          hours = targetDateObj.getHours();
          minutes = targetDateObj.getMinutes();
        }
      }
      normalizedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    const patch: any = {};
    if (title) patch.title = title.trim();
    if (subject) patch.subject = subject.trim();
    if (html !== undefined) patch.html = html;
    if (date) patch.date = date;
    if (time) patch.time = time;
    if (timezone) patch.timezone = timezone;
    if (audience) patch.audience = audience;
    if (recipients !== undefined) {
      let r = recipients;
      if (typeof r === "string") {
        try {
          r = JSON.parse(r);
        } catch {}
      }
      patch.recipients = JSON.stringify(r);
    }
    if (targetDateObj) {
      patch.scheduledAt = targetDateObj;
      patch.status = "scheduled";
    }

    if (isPrismaConnected) {
      const updated = await prisma.scheduledJob.update({
        where: { id },
        data: patch,
      });

      if (targetDateObj) {
        const delayMs = targetDateObj.getTime() - Date.now();
        if (delayMs > 0) {
          await enqueueJob(
            { type: "SCHEDULED_SEND", scheduledJobId: id },
            delayMs,
            `sched-${id}`
          );
        }
      }

      return res.json(formatWithUnderscoreId(updated));
    }

    res.status(501).json({ error: "Storage not supported" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST pause scheduled send
router.post("/:id/pause", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isPrismaConnected) {
      const updated = await prisma.scheduledJob.update({
        where: { id },
        data: { status: "paused" },
      });
      return res.json({ message: "Scheduled job paused", job: formatWithUnderscoreId(updated) });
    }
    res.json({ message: "Paused" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST resume scheduled send
router.post("/:id/resume", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isPrismaConnected) {
      const job = await prisma.scheduledJob.findUnique({ where: { id } });
      if (!job) return res.status(404).json({ error: "Job not found" });

      const targetDate = job.scheduledAt || new Date(`${job.date}T${job.time}:00`);
      const delayMs = targetDate.getTime() - Date.now();

      const updated = await prisma.scheduledJob.update({
        where: { id },
        data: { status: "scheduled" },
      });

      if (delayMs > 0) {
        await enqueueJob(
          { type: "SCHEDULED_SEND", scheduledJobId: id },
          delayMs,
          `sched-${id}`
        );
      }

      return res.json({ message: "Scheduled job resumed", job: formatWithUnderscoreId(updated) });
    }
    res.json({ message: "Resumed" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST cancel scheduled send
router.post("/:id/cancel", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isPrismaConnected) {
      const updated = await prisma.scheduledJob.update({
        where: { id },
        data: { status: "cancelled" },
      });
      return res.json({ message: "Scheduled job cancelled", job: formatWithUnderscoreId(updated) });
    }
    res.json({ message: "Cancelled" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. DELETE schedule
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPrismaConnected) {
      await prisma.scheduledJob.delete({ where: { id } }).catch(() => null);
      return res.json({ message: "Scheduled send deleted", id });
    }

    if (isMongoConnected) {
      await ScheduledJob.findByIdAndDelete(id);
    } else {
      await memoryDb.schedules.findByIdAndDelete(id);
    }
    res.json({ message: "Scheduled send deleted", id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. POST run immediately
router.post("/:id/run-now", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPrismaConnected) {
      const job = await prisma.scheduledJob.findUnique({ where: { id } });
      if (!job) return res.status(404).json({ error: "Schedule not found" });

      await prisma.scheduledJob.update({ where: { id }, data: { status: "processing" } });
      await enqueueJob({ type: "SCHEDULED_SEND", scheduledJobId: id });
      return res.json({ message: "Job triggered immediately", id });
    }

    if (isMongoConnected) {
      await ScheduledJob.findByIdAndUpdate(id, { status: "processing" });
    }
    await enqueueJob({ type: "SCHEDULED_SEND", scheduledJobId: id });
    res.json({ message: "Job triggered immediately", id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
