import { Router, Request, Response } from "express";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { Campaign } from "../models/Campaign.js";
import { Contact } from "../models/Contact.js";
import { EmailLog } from "../models/EmailLog.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail } from "../services/emailService.js";
import { enqueueJob } from "../services/queueService.js";
import { getAuthUserId } from "../utils/authHelper.js";

const router = Router();

export interface BulkRecipientInput {
  email: string;
  name?: string;
  company?: string;
  contactId?: string;
  customFields?: Record<string, string>;
}

export function validateEmailSyntax(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// 1. GET /api/bulk-send/campaigns — list all bulk campaigns
router.get("/campaigns", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);

    if (isPrismaConnected) {
      const campaigns = await prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { emailLogs: true },
          },
        },
      });

      const formatted = campaigns.map((c) => ({
        id: c.id,
        _id: c.id,
        name: c.name,
        subject: c.subject,
        html: c.html,
        status: c.status,
        audience: c.audience,
        sent: c.sent,
        opens: c.opens,
        clicks: c.clicks,
        date: c.date,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
        totalRecipients: c._count.emailLogs,
      }));

      return res.json({ success: true, campaigns: formatted });
    }

    if (isMongoConnected) {
      const campaigns = await Campaign.find().sort({ createdAt: -1 });
      return res.json({
        success: true,
        campaigns: campaigns.map((c: any) => ({
          id: String(c._id),
          _id: String(c._id),
          name: c.name,
          subject: c.subject,
          html: c.html,
          status: c.status,
          audience: c.audience,
          sent: c.sent || 0,
          opens: c.opens || 0,
          clicks: c.clicks || 0,
          date: c.date,
          createdAt: c.createdAt,
        })),
      });
    }

    const all = await memoryDb.campaigns.find();
    res.json({ success: true, campaigns: all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/bulk-send/campaigns/:id — get campaign details & logs
router.get("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { id } = req.params;

    if (isPrismaConnected) {
      const campaign = await prisma.campaign.findFirst({
        where: { id, userId },
        include: {
          emailLogs: {
            orderBy: { createdAt: "asc" },
            take: 200,
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      return res.json({
        success: true,
        campaign: {
          ...campaign,
          _id: campaign.id,
        },
      });
    }

    if (isMongoConnected) {
      const campaign = await Campaign.findById(id);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      const logs = await EmailLog.find({ campaignId: id }).limit(200);
      return res.json({
        success: true,
        campaign: {
          ...campaign.toObject(),
          id: String(campaign._id),
          _id: String(campaign._id),
          emailLogs: logs,
        },
      });
    }

    const campaign = await memoryDb.campaigns.findById(id);
    res.json({ success: true, campaign });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/bulk-send/campaigns/:id/status — live polling status
router.get("/campaigns/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPrismaConnected) {
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          sent: true,
          opens: true,
          clicks: true,
          _count: {
            select: { emailLogs: true },
          },
        },
      });

      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const failedCount = await prisma.emailLog.count({
        where: { campaignId: id, status: "failed" },
      });

      const sentLogsCount = await prisma.emailLog.count({
        where: { campaignId: id, status: "sent" },
      });

      const lastFailedLog = await prisma.emailLog.findFirst({
        where: { campaignId: id, status: "failed" },
        orderBy: { updatedAt: "desc" },
        select: { error: true },
      });

      return res.json({
        success: true,
        status: campaign.status,
        sent: sentLogsCount,
        failed: failedCount,
        total: campaign._count.emailLogs,
        opens: campaign.opens,
        clicks: campaign.clicks,
        lastError: lastFailedLog?.error || null,
      });
    }

    res.json({ success: true, status: "sent", sent: 0, failed: 0, total: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/bulk-send — Create & Dispatch / Schedule / Draft Campaign
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const {
      campaignName,
      subject,
      html,
      recipients = [],
      recipientIds = [],
      manualEmails = [],
      cc,
      bcc,
      action = "send", // 'send' | 'schedule' | 'draft'
      scheduledAt,
    } = req.body;

    const trimmedSubject = String(subject || "").trim();
    const trimmedHtml = String(html || "").trim();
    const finalCampaignName = String(campaignName || "").trim() || `Campaign: ${trimmedSubject || "Untitled"}`;

    if (!trimmedSubject) {
      return res.status(400).json({ error: "Subject line is required" });
    }
    if (!trimmedHtml) {
      return res.status(400).json({ error: "Email content is required" });
    }

    // 1. Gather all intended recipients
    const recipientsMap = new Map<string, BulkRecipientInput>();

    // A. From structured uploaded recipients array
    if (Array.isArray(recipients) && recipients.length > 0) {
      recipients.forEach((r: any) => {
        const email = String(r.email || "").trim().toLowerCase();
        if (validateEmailSyntax(email)) {
          recipientsMap.set(email, {
            email,
            name: String(r.name || "").trim() || email.split("@")[0] || "Recipient",
            company: String(r.company || "").trim() || undefined,
            contactId: r.contactId,
            customFields: r.customFields || {},
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
          const email = c.email.toLowerCase().trim();
          if (c.status !== "unsubscribed" && c.status !== "bounced") {
            recipientsMap.set(email, {
              email,
              name: c.name || email.split("@")[0] || "Recipient",
              company: c.company || undefined,
              contactId: c.id,
            });
          }
        });
      } else if (isMongoConnected) {
        const found = await Contact.find({ _id: { $in: recipientIds } });
        found.forEach((c) => {
          const email = c.email.toLowerCase().trim();
          if (c.status !== "unsubscribed" && c.status !== "bounced") {
            recipientsMap.set(email, {
              email,
              name: c.name || email.split("@")[0] || "Recipient",
              company: c.company || undefined,
              contactId: String(c._id),
            });
          }
        });
      }
    }

    // C. From manual raw emails
    if (Array.isArray(manualEmails)) {
      manualEmails.forEach((raw: string) => {
        const email = String(raw || "").trim().toLowerCase();
        if (validateEmailSyntax(email) && !recipientsMap.has(email)) {
          recipientsMap.set(email, {
            email,
            name: email.split("@")[0] || "Recipient",
          });
        }
      });
    }

    const validRecipientsList = Array.from(recipientsMap.values());

    if (action !== "draft" && validRecipientsList.length === 0) {
      return res.status(400).json({
        error: "Please select at least one valid recipient or upload a valid recipient list.",
      });
    }

    const ccStr = Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc).trim() : null);
    const bccStr = Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc).trim() : null);
    const audienceStr = `${validRecipientsList.length} verified recipient(s)`;

    // 2. Determine initial status
    let initialStatus = "draft";
    if (action === "send") initialStatus = "sending";
    else if (action === "schedule") initialStatus = "scheduled";

    // 3. Create Campaign in DB
    let campaignId = "";
    let scheduledDateObj: Date | null = null;
    if (scheduledAt) {
      if (typeof scheduledAt === "string" && scheduledAt.includes("T")) {
        const [dPart, tPart] = scheduledAt.split("T");
        const [y, m, d] = (dPart || "").split("-").map(Number);
        const [hh, mm] = (tPart || "").split(":").map(Number);
        scheduledDateObj = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
      } else {
        scheduledDateObj = new Date(scheduledAt);
      }
    }

    const recipientsJson = JSON.stringify(validRecipientsList);

    if (isPrismaConnected) {
      const created = await prisma.campaign.create({
        data: {
          userId,
          name: finalCampaignName,
          subject: trimmedSubject,
          html: trimmedHtml,
          audience: audienceStr,
          recipients: recipientsJson,
          status: initialStatus,
          sent: 0,
          opens: 0,
          clicks: 0,
          date: new Date().toISOString().slice(0, 10),
          scheduledAt: scheduledDateObj,
        },
      });
      campaignId = created.id;

      // If scheduled, register a ScheduledJob record with full recipients list for scheduler pickup
      if (action === "schedule" && scheduledDateObj) {
        const year = scheduledDateObj.getFullYear();
        const month = String(scheduledDateObj.getMonth() + 1).padStart(2, "0");
        const day = String(scheduledDateObj.getDate()).padStart(2, "0");
        const isoDate = `${year}-${month}-${day}`;
        const timeStr = `${String(scheduledDateObj.getHours()).padStart(2, "0")}:${String(scheduledDateObj.getMinutes()).padStart(2, "0")}`;

        const createdJob = await prisma.scheduledJob.create({
          data: {
            userId,
            title: finalCampaignName,
            subject: trimmedSubject,
            html: trimmedHtml,
            date: isoDate,
            time: timeStr,
            timezone: "Asia/Kolkata",
            audience: audienceStr,
            recipients: recipientsJson,
            status: "scheduled",
            scheduledAt: scheduledDateObj,
            campaignId,
          },
        }).catch((e) => {
          console.error("[BulkRoutes] ScheduledJob creation error:", e.message);
          return null;
        });

        if (createdJob) {
          const delayMs = Math.max(0, scheduledDateObj.getTime() - Date.now());
          await enqueueJob(
            { type: "SCHEDULED_SEND", scheduledJobId: createdJob.id },
            delayMs,
            `sched-${createdJob.id}`
          );
        }
      }
    } else if (isMongoConnected) {
      const created = await Campaign.create({
        name: finalCampaignName,
        subject: trimmedSubject,
        html: trimmedHtml,
        audience: audienceStr,
        recipients: recipientsJson,
        status: initialStatus,
        sent: 0,
        opens: 0,
        clicks: 0,
        date: new Date().toISOString().slice(0, 10),
      });
      campaignId = String(created._id);
    } else {
      const created = await memoryDb.campaigns.create({
        name: finalCampaignName,
        subject: trimmedSubject,
        html: trimmedHtml,
        audience: audienceStr,
        recipients: recipientsJson,
        status: initialStatus,
        sent: 0,
        opens: 0,
        clicks: 0,
        date: new Date().toISOString().slice(0, 10),
      });
      campaignId = String(created._id);
    }

    // If draft or schedule, respond immediately
    if (action === "draft") {
      return res.json({
        success: true,
        message: `Campaign "${finalCampaignName}" saved as draft`,
        campaignId,
        status: "draft",
        totalRecipients: validRecipientsList.length,
      });
    }

    if (action === "schedule") {
      return res.json({
        success: true,
        message: `Campaign scheduled for ${scheduledAt}`,
        campaignId,
        status: "scheduled",
        totalRecipients: validRecipientsList.length,
      });
    }

    // 4. ACTION === "send": Immediate Dispatch
    // Create initial pending EmailLog records
    const createdLogs: Array<{ id: string; target: BulkRecipientInput }> = [];

    if (isPrismaConnected) {
      for (const target of validRecipientsList) {
        try {
          const log = await prisma.emailLog.create({
            data: {
              userId,
              campaignId,
              contactId: target.contactId,
              recipientEmail: target.email,
              recipientName: target.name || "",
              subject: trimmedSubject,
              cc: ccStr,
              bcc: bccStr,
              status: "queued",
            },
          });
          createdLogs.push({ id: log.id, target });
        } catch {
          // ignore log insert collision
        }
      }
    }

    // Asynchronously dispatch all emails via Brevo / SMTP with rate limit pacing
    (async () => {
      let sentSuccessCount = 0;
      let sentFailureCount = 0;

      for (let i = 0; i < validRecipientsList.length; i++) {
        const target = validRecipientsList[i]!;
        const logEntry = createdLogs.find((l) => l.target.email === target.email);
        const logId = logEntry?.id;

        try {
          const result = await sendEmail({
            to: target.email,
            recipientName: target.name,
            cc,
            bcc,
            subject: trimmedSubject,
            html: trimmedHtml,
            logId,
            contactId: target.contactId,
            variables: {
              name: target.name || "Subscriber",
              email: target.email,
              company: target.company || "Mailora",
              ...(target.customFields || {}),
            },
          });

          if (result.success) {
            sentSuccessCount++;
            if (isPrismaConnected && logId) {
              await prisma.emailLog.update({
                where: { id: logId },
                data: {
                  status: "sent",
                  messageId: result.messageId || `brevo-${Date.now()}`,
                },
              }).catch(() => null);

              await prisma.campaign.update({
                where: { id: campaignId },
                data: { sent: { increment: 1 } },
              }).catch(() => null);
            }
          } else {
            sentFailureCount++;
            if (isPrismaConnected && logId) {
              await prisma.emailLog.update({
                where: { id: logId },
                data: {
                  status: "failed",
                  error: result.error || "Delivery rejected",
                },
              }).catch(() => null);
            }
          }
        } catch (dispatchErr: any) {
          sentFailureCount++;
          if (isPrismaConnected && logId) {
            await prisma.emailLog.update({
              where: { id: logId },
              data: {
                status: "failed",
                error: dispatchErr.message || "Dispatch error",
              },
            }).catch(() => null);
          }
        }

        // Pacing delay (350ms) to ensure smooth SMTP delivery and avoid spam burst flags
        if (i < validRecipientsList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }

      // Mark final campaign status based on delivery outcomes
      const finalStatus =
        sentSuccessCount === 0 && sentFailureCount > 0
          ? "failed"
          : sentFailureCount > 0
          ? "partially_sent"
          : "sent";

      if (isPrismaConnected) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: finalStatus },
        }).catch(() => null);
      } else if (isMongoConnected) {
        await Campaign.findByIdAndUpdate(campaignId, { status: finalStatus }).catch(() => null);
      }
      console.log(`[BulkRoutes] Campaign ${campaignId} finished. Sent: ${sentSuccessCount}, Failed: ${sentFailureCount}, Status: ${finalStatus}`);
    })().catch((e) => console.error("[BulkRoutes] Background dispatch error:", e));

    res.json({
      success: true,
      message: `Bulk campaign dispatch started to ${validRecipientsList.length} verified recipient(s).`,
      campaignId,
      status: "sending",
      totalRecipients: validRecipientsList.length,
      recipients: validRecipientsList.map((r) => r.email),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/bulk-send/campaigns/:id/duplicate — duplicate campaign as draft
router.post("/campaigns/:id/duplicate", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { id } = req.params;

    if (isPrismaConnected) {
      const existing = await prisma.campaign.findFirst({
        where: { id, userId },
      });
      if (!existing) return res.status(404).json({ error: "Campaign not found" });

      const copy = await prisma.campaign.create({
        data: {
          userId,
          name: `${existing.name} (Copy)`,
          subject: existing.subject,
          html: existing.html,
          audience: existing.audience,
          status: "draft",
          sent: 0,
          opens: 0,
          clicks: 0,
          date: new Date().toISOString().slice(0, 10),
        },
      });

      return res.json({
        success: true,
        message: "Campaign duplicated successfully",
        campaign: { ...copy, _id: copy.id },
      });
    }

    res.status(501).json({ error: "Not supported in this storage mode" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE /api/bulk-send/campaigns/:id — delete campaign
router.delete("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { id } = req.params;

    if (isPrismaConnected) {
      await prisma.emailLog.deleteMany({ where: { campaignId: id } }).catch(() => null);
      await prisma.campaign.deleteMany({ where: { id, userId } });
      return res.json({ success: true, message: "Campaign deleted" });
    }

    if (isMongoConnected) {
      await EmailLog.deleteMany({ campaignId: id }).catch(() => null);
      await Campaign.findByIdAndDelete(id);
      return res.json({ success: true, message: "Campaign deleted" });
    }

    res.json({ success: true, message: "Campaign deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
