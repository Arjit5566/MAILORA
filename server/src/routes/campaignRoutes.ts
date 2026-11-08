import { Router, Request, Response } from "express";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { Campaign } from "../models/Campaign.js";
import { EmailLog } from "../models/EmailLog.js";
import { memoryDb } from "../utils/memoryStore.js";
import { enqueueJob } from "../services/queueService.js";
import { sendEmail } from "../services/emailService.js";
import { getAuthUserId, mapWithUnderscoreId, formatWithUnderscoreId } from "../utils/authHelper.js";

const router = Router();

// GET all campaigns
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);

    if (isPrismaConnected) {
      const list = await prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return res.json(mapWithUnderscoreId(list));
    }

    if (isMongoConnected) {
      const campaigns = await Campaign.find().sort({ createdAt: -1 });
      return res.json(campaigns);
    }

    const campaigns = await memoryDb.campaigns.find();
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single campaign by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      const campaign = await prisma.campaign.findUnique({ where: { id } });
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      return res.json(formatWithUnderscoreId(campaign));
    }

    let campaign: any;
    if (isMongoConnected) {
      campaign = await Campaign.findById(id);
    } else {
      campaign = await memoryDb.campaigns.findById(id);
    }
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create campaign
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { name, subject, audience, html, status, date, recipients, fromName, fromEmail, timezone, scheduledAt } = req.body;
    if (!name || !subject) {
      return res.status(400).json({ error: "Name and subject are required" });
    }

    const recipientsJson = recipients ? JSON.stringify(recipients) : null;

    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      audience: audience || (recipients && Array.isArray(recipients) ? `${recipients.length} recipients` : "All contacts"),
      html: html || "",
      status: status || "draft",
      date: date || new Date().toISOString().slice(0, 10),
      recipients: recipientsJson,
      fromName: fromName || null,
      fromEmail: fromEmail || null,
      timezone: timezone || "UTC",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sent: 0,
      opens: 0,
      clicks: 0,
    };

    if (isPrismaConnected) {
      const created = await prisma.campaign.create({
        data: { userId, ...payload },
      });

      if (created.status === "sending") {
        await enqueueJob({ type: "CAMPAIGN_SEND", campaignId: created.id });
      }

      return res.status(201).json(formatWithUnderscoreId(created));
    }

    let created: any;
    if (isMongoConnected) {
      created = await Campaign.create(payload);
    } else {
      created = await memoryDb.campaigns.create(payload);
    }

    if (created.status === "sending") {
      await enqueueJob({ type: "CAMPAIGN_SEND", campaignId: String(created._id) });
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update campaign
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, subject, audience, html, status, date, recipients, fromName, fromEmail, timezone, scheduledAt } = req.body;

    if (isPrismaConnected) {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (subject !== undefined) data.subject = subject;
      if (audience !== undefined) data.audience = audience;
      if (html !== undefined) data.html = html;
      if (status !== undefined) data.status = status;
      if (date !== undefined) data.date = date;
      if (recipients !== undefined) data.recipients = JSON.stringify(recipients);
      if (fromName !== undefined) data.fromName = fromName;
      if (fromEmail !== undefined) data.fromEmail = fromEmail;
      if (timezone !== undefined) data.timezone = timezone;
      if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

      const updated = await prisma.campaign.update({ where: { id }, data });

      if (data.status === "sending") {
        await enqueueJob({ type: "CAMPAIGN_SEND", campaignId: id });
      }

      return res.json(formatWithUnderscoreId(updated));
    }

    const patch: any = {};
    if (name !== undefined) patch.name = name;
    if (subject !== undefined) patch.subject = subject;
    if (audience !== undefined) patch.audience = audience;
    if (html !== undefined) patch.html = html;
    if (status !== undefined) patch.status = status;
    if (date !== undefined) patch.date = date;

    let updated: any;
    if (isMongoConnected) {
      updated = await Campaign.findByIdAndUpdate(id, patch, { new: true });
    } else {
      updated = await memoryDb.campaigns.findByIdAndUpdate(id, patch);
    }

    if (!updated) return res.status(404).json({ error: "Campaign not found" });

    if (patch.status === "sending") {
      await enqueueJob({ type: "CAMPAIGN_SEND", campaignId: id });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE campaign
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      await prisma.campaign.delete({ where: { id } }).catch(() => null);
      return res.json({ message: "Campaign deleted", id });
    }

    let deleted: any;
    if (isMongoConnected) {
      deleted = await Campaign.findByIdAndDelete(id);
    } else {
      deleted = await memoryDb.campaigns.findByIdAndDelete(id);
    }
    if (!deleted) return res.status(404).json({ error: "Campaign not found" });
    res.json({ message: "Campaign deleted", id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Duplicate Campaign
router.post("/:id/duplicate", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const id = req.params.id;

    let original: any;
    if (isPrismaConnected) {
      original = await prisma.campaign.findUnique({ where: { id } });
    } else if (isMongoConnected) {
      original = await Campaign.findById(id);
    } else {
      original = await memoryDb.campaigns.findById(id);
    }

    if (!original) return res.status(404).json({ error: "Campaign not found" });

    if (isPrismaConnected) {
      const { id: _id, createdAt, updatedAt, sent, opens, clicks, ...rest } = original;
      const dup = await prisma.campaign.create({
        data: {
          ...rest,
          userId,
          name: original.name + " (Copy)",
          status: "draft",
          sent: 0,
          opens: 0,
          clicks: 0,
          date: new Date().toISOString().slice(0, 10),
        },
      });
      return res.status(201).json(formatWithUnderscoreId(dup));
    }

    res.status(400).json({ error: "Duplicate not supported in this DB mode" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Resume Campaign (set back to draft)
router.post("/:id/resume", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      const updated = await prisma.campaign.update({
        where: { id },
        data: { status: "draft" },
      });
      return res.json(formatWithUnderscoreId(updated));
    }

    if (isMongoConnected) {
      const updated = await Campaign.findByIdAndUpdate(id, { status: "draft" }, { new: true });
      if (!updated) return res.status(404).json({ error: "Campaign not found" });
      return res.json(updated);
    }

    res.status(400).json({ error: "Not supported" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Trigger Campaign Send (exclusively to selected recipients)
router.post("/:id/send", async (req: Request, res: Response) => {
  try {
    const campaignId = req.params.id;
    const userId = await getAuthUserId(req);
    const { recipientIds = [], manualEmails = [], recipients: directRecipients = [], cc, bcc } = req.body;

    let campaign: any;
    if (isPrismaConnected) {
      campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    } else if (isMongoConnected) {
      campaign = await Campaign.findById(campaignId);
    } else {
      campaign = await memoryDb.campaigns.findById(campaignId);
    }

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    // Build recipient set
    const recipientsMap = new Map<string, { email: string; name: string; contactId?: string }>();

    // 1. Direct recipients passed in body
    if (Array.isArray(directRecipients) && directRecipients.length > 0) {
      directRecipients.forEach((r: any) => {
        if (r && r.email && String(r.email).includes("@")) {
          const email = String(r.email).trim().toLowerCase();
          recipientsMap.set(email, { email, name: r.name || email.split("@")[0] });
        }
      });
    }

    // 2. Stored recipients on campaign model
    if (recipientsMap.size === 0 && campaign.recipients) {
      try {
        const stored = JSON.parse(campaign.recipients);
        if (Array.isArray(stored)) {
          stored.forEach((r: any) => {
            if (r && r.email && String(r.email).includes("@")) {
              const email = String(r.email).trim().toLowerCase();
              recipientsMap.set(email, { email, name: r.name || email.split("@")[0] });
            }
          });
        }
      } catch {}
    }

    // 3. Contact IDs from request
    if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      if (isPrismaConnected) {
        const contacts = await prisma.contact.findMany({ where: { userId, id: { in: recipientIds } } });
        contacts.forEach((c) => recipientsMap.set(c.email.toLowerCase(), { email: c.email.toLowerCase(), name: c.name, contactId: c.id }));
      }
    }

    // 4. Manual emails from request
    if (Array.isArray(manualEmails) && manualEmails.length > 0) {
      manualEmails.forEach((raw: string) => {
        const clean = String(raw).trim().toLowerCase();
        if (clean.includes("@") && !recipientsMap.has(clean)) {
          recipientsMap.set(clean, { email: clean, name: clean.split("@")[0] || "Recipient" });
        }
      });
    }

    const targets = Array.from(recipientsMap.values());

    if (targets.length === 0) {
      // Fall back to queue
      await enqueueJob({ type: "CAMPAIGN_SEND", campaignId });
      return res.json({ message: "Campaign queued for sending", campaignId });
    }

    const ccStr = Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc).trim() : null);
    const bccStr = Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc).trim() : null);

    // Update status to sending
    if (isPrismaConnected) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "sending" } }).catch(() => null);
    }

    // Asynchronous background dispatcher
    (async () => {
      let sentCount = 0;
      for (const target of targets) {
        let logId: string | undefined;
        if (isPrismaConnected) {
          const log = await prisma.emailLog.create({
            data: {
              userId,
              recipientEmail: target.email,
              recipientName: target.name,
              cc: ccStr,
              bcc: bccStr,
              subject: campaign.subject,
              campaignId,
              contactId: target.contactId,
              status: "queued",
            },
          });
          logId = log.id;
        }

        const result = await sendEmail({
          to: target.email,
          recipientName: target.name,
          cc,
          bcc,
          subject: campaign.subject,
          html: campaign.html,
          logId,
          contactId: target.contactId,
          variables: { name: target.name, email: target.email },
        });

        if (result.success) {
          sentCount++;
          if (isPrismaConnected && logId) {
            await prisma.emailLog.update({ where: { id: logId }, data: { status: "sent", messageId: result.messageId } }).catch(() => null);
            await prisma.campaign.update({ where: { id: campaignId }, data: { sent: { increment: 1 } } }).catch(() => null);
          }
        } else if (isPrismaConnected && logId) {
          await prisma.emailLog.update({ where: { id: logId }, data: { status: "failed", error: result.error } }).catch(() => null);
        }
        await new Promise((r) => setTimeout(r, 350));
      }

      if (isPrismaConnected) {
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: "sent" } }).catch(() => null);
      }
    })().catch(console.error);

    return res.json({
      message: `Campaign dispatch started for ${targets.length} recipient(s)`,
      recipientsCount: targets.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Send Test Email for Campaign
router.post("/:id/test", async (req: Request, res: Response) => {
  try {
    const { toEmail, testEmail, recipientName, cc, bcc } = req.body;
    const targetEmail = toEmail || testEmail;
    if (!targetEmail) return res.status(400).json({ error: "Recipient email is required" });

    const userId = await getAuthUserId(req);

    let campaign: any;
    if (isPrismaConnected) {
      campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    } else if (isMongoConnected) {
      campaign = await Campaign.findById(req.params.id);
    } else {
      campaign = await memoryDb.campaigns.findById(req.params.id);
    }

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const result = await sendEmail({
      to: targetEmail,
      recipientName: recipientName || "Test Recipient",
      cc,
      bcc,
      subject: `[TEST] ${campaign.subject}`,
      html: campaign.html,
      variables: { name: recipientName || "Test User", company: "SendFlow Demo" },
    });

    if (isPrismaConnected) {
      await prisma.emailLog.create({
        data: {
          userId,
          recipientEmail: String(targetEmail).trim(),
          recipientName: recipientName || "Test Recipient",
          cc: Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc) : null),
          bcc: Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc) : null),
          subject: `[TEST] ${campaign.subject}`,
          campaignId: campaign.id,
          status: result.success ? "sent" : "failed",
          messageId: result.messageId || null,
          error: result.error || null,
        },
      }).catch(() => null);
    }

    res.json({
      success: result.success,
      message: result.success ? `Test email dispatched to ${targetEmail}` : `Failed: ${result.error}`,
      previewUrl: result.previewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Also support legacy test-send path
router.post("/:id/test-send", async (req: Request, res: Response) => {
  const { testEmail, toEmail, recipientName } = req.body;
  req.body.toEmail = testEmail || toEmail;
  return (router as any).handle(req, res);
});

// POST Pause Campaign
router.post("/:id/pause", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      const updated = await prisma.campaign.update({
        where: { id },
        data: { status: "paused" },
      });
      return res.json(formatWithUnderscoreId(updated));
    }

    let updated: any;
    if (isMongoConnected) {
      updated = await Campaign.findByIdAndUpdate(id, { status: "paused" }, { new: true });
    } else {
      updated = await memoryDb.campaigns.findByIdAndUpdate(id, { status: "paused" });
    }
    if (!updated) return res.status(404).json({ error: "Campaign not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET campaign stats and delivery logs
router.get("/:id/stats", async (req: Request, res: Response) => {
  try {
    const campaignId = req.params.id;
    let campaign: any;

    if (isPrismaConnected) {
      campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    } else if (isMongoConnected) {
      campaign = await Campaign.findById(campaignId);
    } else {
      campaign = await memoryDb.campaigns.findById(campaignId);
    }

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    let logs: any[] = [];
    if (isPrismaConnected) {
      logs = await prisma.emailLog.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      });
    } else if (isMongoConnected) {
      logs = await EmailLog.find({ campaignId }).sort({ createdAt: -1 });
    }

    const totalSent = campaign.sent || 0;
    const opens = campaign.opens || 0;
    const clicks = campaign.clicks || 0;

    res.json({
      campaign: isPrismaConnected ? formatWithUnderscoreId(campaign) : campaign,
      metrics: {
        sent: totalSent,
        opens: opens,
        clicks: clicks,
        openRate: totalSent > 0 ? ((opens / totalSent) * 100).toFixed(1) + "%" : "0%",
        clickRate: totalSent > 0 ? ((clicks / totalSent) * 100).toFixed(1) + "%" : "0%",
      },
      recentLogs: logs.slice(0, 100),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
