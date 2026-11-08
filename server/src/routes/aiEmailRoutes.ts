import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { AiEmail } from "../models/AiEmail.js";
import { EmailLog } from "../models/EmailLog.js";
import { ScheduledJob } from "../models/ScheduledJob.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail } from "../services/emailService.js";
import { generateEmailWithGemini } from "../services/geminiService.js";
import { enqueueJob } from "../services/queueService.js";

const router = Router();

async function getUserIdFromReq(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, config.jwtSecret) as { userId?: string };
      if (decoded?.userId) {
        if (isPrismaConnected) {
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
          if (user) return user.id;
        } else {
          return decoded.userId;
        }
      }
    } catch {
      // fallback
    }
  }

  if (isPrismaConnected) {
    try {
      const first = await prisma.user.findFirst();
      if (first) return first.id;
      const created = await prisma.user.create({
        data: {
          email: "demo@sendflow.app",
          name: "SendFlow Demo User",
          password: "demo_password_hash",
        },
      });
      return created.id;
    } catch (e: any) {
      console.warn("[AiEmailRoutes] Prisma user fallback error:", e.message);
    }
  }

  return "demo-user-id";
}

// 1. POST /api/ai-email/generate
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { emailType, description, recipientName, recipientEmail, tone, senderName, senderCompany } = req.body;

    if (!emailType || !description || !tone) {
      return res.status(400).json({
        error: "emailType, description, and tone are required to generate an email.",
      });
    }

    const generated = await generateEmailWithGemini({
      emailType,
      description,
      recipientName,
      recipientEmail,
      tone,
      senderName,
      senderCompany,
    });

    res.json({
      success: true,
      email: generated,
    });
  } catch (err: any) {
    console.error("[AiEmailRoutes] Generate error:", err);
    res.status(500).json({ error: err.message || "Failed to generate email" });
  }
});

// 2. POST /api/ai-email/send
router.post("/send", async (req: Request, res: Response) => {
  try {
    const {
      recipientEmail,
      recipientName,
      cc,
      bcc,
      subject,
      htmlContent,
      emailType = "General",
      tone = "Professional",
      description = "",
      preheader = "",
    } = req.body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return res.status(400).json({ error: "Valid recipientEmail is required" });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: "Subject line is required" });
    }
    if (!htmlContent || !htmlContent.trim()) {
      return res.status(400).json({ error: "Email body content is required" });
    }

    const userId = await getUserIdFromReq(req);

    // Send email using existing Brevo / SMTP / Ethereal service with CC & BCC
    const sendResult = await sendEmail({
      to: recipientEmail.trim(),
      recipientName: recipientName?.trim() || "",
      cc,
      bcc,
      subject: subject.trim(),
      html: htmlContent,
    });

    const isSuccess = sendResult.success;
    const errorMsg = sendResult.error || (isSuccess ? undefined : "Email delivery failed");

    let savedRecord: any = null;

    const ccStr = Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc).trim() : null);
    const bccStr = Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc).trim() : null);

    // 1. PostgreSQL via Prisma
    if (isPrismaConnected) {
      try {
        savedRecord = await prisma.aiEmail.create({
          data: {
            userId,
            recipientEmail: recipientEmail.trim(),
            recipientName: recipientName?.trim() || "",
            cc: ccStr,
            bcc: bccStr,
            emailType,
            tone,
            description,
            subject: subject.trim(),
            htmlContent,
            preheader: preheader || null,
            status: isSuccess ? "sent" : "failed",
            sentAt: isSuccess ? new Date() : null,
            error: errorMsg,
            messageId: sendResult.messageId || null,
            previewUrl: sendResult.previewUrl || null,
          },
        });

        // Also add an EmailLog for analytics tracking with CC/BCC
        await prisma.emailLog.create({
          data: {
            userId,
            recipientEmail: recipientEmail.trim(),
            recipientName: recipientName?.trim() || "",
            cc: ccStr,
            bcc: bccStr,
            subject: subject.trim(),
            status: isSuccess ? "sent" : "failed",
            messageId: sendResult.messageId || null,
            error: errorMsg,
          },
        });
      } catch (prismaErr: any) {
        if (prismaErr.message?.includes("22P05") || prismaErr.message?.includes("WIN1252")) {
          try {
            const stripNonAscii = (s: string | null | undefined) => (s ? s.replace(/[^\x00-\x7F]/g, "") : null);
            savedRecord = await prisma.aiEmail.create({
              data: {
                userId,
                recipientEmail: recipientEmail.trim(),
                recipientName: recipientName?.trim() || "",
                cc: ccStr,
                bcc: bccStr,
                emailType,
                tone,
                description: stripNonAscii(description) || description,
                subject: stripNonAscii(subject.trim()) || "AI Generated Email",
                htmlContent: stripNonAscii(htmlContent) || htmlContent,
                preheader: stripNonAscii(preheader),
                status: isSuccess ? "sent" : "failed",
                sentAt: isSuccess ? new Date() : null,
                error: errorMsg,
                messageId: sendResult.messageId || null,
                previewUrl: sendResult.previewUrl || null,
              },
            });
            await prisma.emailLog.create({
              data: {
                userId,
                recipientEmail: recipientEmail.trim(),
                recipientName: recipientName?.trim() || "",
                cc: ccStr,
                bcc: bccStr,
                subject: stripNonAscii(subject.trim()) || "AI Generated Email",
                status: isSuccess ? "sent" : "failed",
                messageId: sendResult.messageId || null,
                error: errorMsg,
              },
            });
          } catch (retryErr: any) {
            console.error("[AiEmailRoutes] Prisma retry error:", retryErr.message);
          }
        } else {
          console.error("[AiEmailRoutes] Prisma save error:", prismaErr.message);
        }
      }
    }

    // 2. MongoDB
    if (isMongoConnected) {
      try {
        const mongoRecord = await AiEmail.create({
          userId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName?.trim() || "",
          emailType,
          tone,
          description,
          subject: subject.trim(),
          htmlContent,
          preheader: preheader || "",
          status: isSuccess ? "sent" : "failed",
          sentAt: isSuccess ? new Date() : null,
          error: errorMsg,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        });
        if (!savedRecord) savedRecord = mongoRecord;

        await EmailLog.create({
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName?.trim() || "",
          subject: subject.trim(),
          status: isSuccess ? "sent" : "failed",
          messageId: sendResult.messageId,
          error: errorMsg,
        });
      } catch (mongoErr: any) {
        console.error("[AiEmailRoutes] Mongo save error:", mongoErr.message);
      }
    }

    // 3. In-Memory fallback
    if (!savedRecord) {
      savedRecord = await memoryDb.aiEmails.create({
        userId,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName?.trim() || "",
        emailType,
        tone,
        description,
        subject: subject.trim(),
        htmlContent,
        preheader,
        status: isSuccess ? "sent" : "failed",
        sentAt: isSuccess ? new Date() : null,
        error: errorMsg,
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl,
      });

      await memoryDb.emailLogs.create({
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName?.trim() || "",
        subject: subject.trim(),
        status: isSuccess ? "sent" : "failed",
        messageId: sendResult.messageId,
        error: errorMsg,
      });
    }

    if (!isSuccess) {
      return res.status(502).json({
        success: false,
        error: errorMsg,
        emailRecord: savedRecord,
      });
    }

    res.json({
      success: true,
      message: `Email successfully sent to ${recipientEmail}`,
      messageId: sendResult.messageId,
      previewUrl: sendResult.previewUrl,
      emailRecord: savedRecord,
    });
  } catch (err: any) {
    console.error("[AiEmailRoutes] Send error:", err);
    res.status(500).json({ error: err.message || "Failed to process send request" });
  }
});

// 3. POST /api/ai-email/schedule
router.post("/schedule", async (req: Request, res: Response) => {
  try {
    const {
      recipientEmail,
      recipientName,
      cc,
      bcc,
      subject,
      htmlContent,
      emailType = "General",
      tone = "Professional",
      description = "",
      preheader = "",
      scheduledAt,
      date,
      time,
    } = req.body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return res.status(400).json({ error: "Valid recipientEmail is required" });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: "Subject line is required" });
    }
    if (!htmlContent || !htmlContent.trim()) {
      return res.status(400).json({ error: "Email body content is required" });
    }

    let targetDate: Date;
    if (scheduledAt) {
      targetDate = new Date(scheduledAt);
    } else if (date && time) {
      targetDate = new Date(`${date}T${time}:00`);
    } else {
      return res.status(400).json({ error: "Scheduled date and time are required" });
    }

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduled date/time provided" });
    }

    const userId = await getUserIdFromReq(req);
    let savedRecord: any = null;

    // 1. PostgreSQL via Prisma
    if (isPrismaConnected) {
      try {
        const ccStr = Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc).trim() : null);
        const bccStr = Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc).trim() : null);

        savedRecord = await prisma.aiEmail.create({
          data: {
            userId,
            recipientEmail: recipientEmail.trim(),
            recipientName: recipientName?.trim() || "",
            cc: ccStr,
            bcc: bccStr,
            emailType,
            tone,
            description,
            subject: subject.trim(),
            htmlContent,
            preheader: preheader || null,
            status: "scheduled",
            scheduledAt: targetDate,
          },
        });

        // Also create a ScheduledJob so it appears in scheduling view
        await prisma.scheduledJob.create({
          data: {
            userId,
            title: `AI Email: ${subject.trim()}`,
            date: targetDate.toISOString().split("T")[0] || "",
            time: targetDate.toTimeString().split(" ")[0]?.slice(0, 5) || "09:00",
            audience: recipientEmail.trim(),
            subject: subject.trim(),
            html: htmlContent,
            status: "scheduled",
          },
        });
      } catch (prismaErr: any) {
        console.error("[AiEmailRoutes] Prisma schedule error:", prismaErr.message);
      }
    }

    // 2. MongoDB
    if (isMongoConnected) {
      try {
        const mongoRecord = await AiEmail.create({
          userId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName?.trim() || "",
          emailType,
          tone,
          description,
          subject: subject.trim(),
          htmlContent,
          preheader: preheader || "",
          status: "scheduled",
          scheduledAt: targetDate,
        });
        if (!savedRecord) savedRecord = mongoRecord;

        const schedJob = await ScheduledJob.create({
          title: `AI Email: ${subject.trim()}`,
          date: targetDate.toISOString().split("T")[0],
          time: targetDate.toTimeString().split(" ")[0]?.slice(0, 5) || "09:00",
          audience: recipientEmail.trim(),
          subject: subject.trim(),
          html: htmlContent,
          status: "scheduled",
        });

        const now = new Date();
        const delayMs = targetDate.getTime() - now.getTime();
        if (delayMs > 0) {
          await enqueueJob(
            { type: "SCHEDULED_SEND", scheduledJobId: String(schedJob._id) },
            delayMs,
            `ai-sched-${schedJob._id}`
          );
        }
      } catch (mongoErr: any) {
        console.error("[AiEmailRoutes] Mongo schedule error:", mongoErr.message);
      }
    }

    // 3. In-memory
    if (!savedRecord) {
      savedRecord = await memoryDb.aiEmails.create({
        userId,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName?.trim() || "",
        emailType,
        tone,
        description,
        subject: subject.trim(),
        htmlContent,
        preheader,
        status: "scheduled",
        scheduledAt: targetDate,
      });

      await memoryDb.schedules.create({
        title: `AI Email: ${subject.trim()}`,
        date: targetDate.toISOString().split("T")[0],
        time: targetDate.toTimeString().split(" ")[0]?.slice(0, 5) || "09:00",
        audience: recipientEmail.trim(),
        subject: subject.trim(),
        html: htmlContent,
        status: "scheduled",
      });
    }

    res.status(201).json({
      success: true,
      message: `Email scheduled for ${targetDate.toLocaleString()}`,
      scheduledAt: targetDate.toISOString(),
      emailRecord: savedRecord,
    });
  } catch (err: any) {
    console.error("[AiEmailRoutes] Schedule error:", err);
    res.status(500).json({ error: err.message || "Failed to schedule email" });
  }
});

// 4. GET /api/ai-email/history
router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromReq(req);

    if (isPrismaConnected) {
      const records = await prisma.aiEmail.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return res.json({ success: true, history: records });
    }

    if (isMongoConnected) {
      const records = await AiEmail.find({ userId }).sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, history: records });
    }

    const records = await memoryDb.aiEmails.find();
    res.json({ success: true, history: records.reverse() });
  } catch (err: any) {
    console.error("[AiEmailRoutes] Get history error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch email history" });
  }
});

// 5. DELETE /api/ai-email/history/:id
router.delete("/history/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPrismaConnected) {
      await prisma.aiEmail.delete({ where: { id } }).catch(() => null);
    }
    if (isMongoConnected) {
      await AiEmail.findByIdAndDelete(id).catch(() => null);
    }
    await memoryDb.aiEmails.findByIdAndDelete(id).catch(() => null);

    res.json({ success: true, message: "History item deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

