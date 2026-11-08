import { Router, Request, Response } from "express";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { EmailLog } from "../models/EmailLog.js";
import { Campaign } from "../models/Campaign.js";
import { Contact } from "../models/Contact.js";
import { memoryDb } from "../utils/memoryStore.js";

const router = Router();

// 1x1 Transparent GIF buffer
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Email Open Tracking Pixel
router.get("/open/:logId", async (req: Request, res: Response) => {
  const { logId } = req.params;

  try {
    if (isPrismaConnected) {
      const log = await prisma.emailLog.findUnique({ where: { id: logId } });
      if (log && log.status !== "opened" && log.status !== "clicked") {
        await prisma.emailLog.update({
          where: { id: logId },
          data: {
            status: "opened",
            openedAt: new Date(),
            userAgent: (req.headers["user-agent"] as string) || "",
          },
        });
        if (log.campaignId) {
          await prisma.campaign.update({
            where: { id: log.campaignId },
            data: { opens: { increment: 1 } },
          }).catch(() => null);
        }
      }
    } else if (isMongoConnected) {
      const log = await EmailLog.findById(logId);
      if (log && log.status !== "opened" && log.status !== "clicked") {
        log.status = "opened";
        log.openedAt = new Date();
        log.userAgent = req.headers["user-agent"] || "";
        await log.save();

        if (log.campaignId) {
          await Campaign.findByIdAndUpdate(log.campaignId, { $inc: { opens: 1 } });
        }
      }
    } else {
      const log = await memoryDb.emailLogs.findById(logId);
      if (log && log.status !== "opened" && log.status !== "clicked") {
        await memoryDb.emailLogs.findByIdAndUpdate(logId, {
          status: "opened",
          openedAt: new Date(),
          userAgent: req.headers["user-agent"] || "",
        });
        if (log.campaignId) {
          const camp = await memoryDb.campaigns.findById(String(log.campaignId));
          if (camp) {
            await memoryDb.campaigns.findByIdAndUpdate(String(log.campaignId), {
              opens: (camp.opens || 0) + 1,
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[Tracking] Error tracking open for ${logId}:`, err.message);
  }

  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_GIF.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(TRANSPARENT_GIF);
});

// Click Tracking Redirect
router.get("/click/:logId", async (req: Request, res: Response) => {
  const { logId } = req.params;
  const targetUrl = (req.query.url as string) || "https://sendflow.app";

  try {
    if (isPrismaConnected) {
      const log = await prisma.emailLog.findUnique({ where: { id: logId } });
      if (log) {
        let currentClicks: any[] = [];
        try {
          currentClicks = Array.isArray(log.clicks) ? (log.clicks as any[]) : [];
        } catch {}
        currentClicks.push({ url: targetUrl, clickedAt: new Date().toISOString() });

        await prisma.emailLog.update({
          where: { id: logId },
          data: {
            status: "clicked",
            clicks: currentClicks,
          },
        });
        if (log.campaignId) {
          await prisma.campaign.update({
            where: { id: log.campaignId },
            data: { clicks: { increment: 1 } },
          }).catch(() => null);
        }
      }
    } else if (isMongoConnected) {
      const log = await EmailLog.findById(logId);
      if (log) {
        log.status = "clicked";
        log.clicks.push({ url: targetUrl, clickedAt: new Date() });
        await log.save();

        if (log.campaignId) {
          await Campaign.findByIdAndUpdate(log.campaignId, { $inc: { clicks: 1 } });
        }
      }
    } else {
      const log = await memoryDb.emailLogs.findById(logId);
      if (log) {
        const clicks = log.clicks || [];
        clicks.push({ url: targetUrl, clickedAt: new Date() });
        await memoryDb.emailLogs.findByIdAndUpdate(logId, { status: "clicked", clicks });
        if (log.campaignId) {
          const camp = await memoryDb.campaigns.findById(String(log.campaignId));
          if (camp) {
            await memoryDb.campaigns.findByIdAndUpdate(String(log.campaignId), {
              clicks: (camp.clicks || 0) + 1,
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[Tracking] Error tracking click for ${logId}:`, err.message);
  }

  res.redirect(targetUrl);
});

// Brevo / General Webhook for Event Tracking (delivered, opened, clicks, soft_bounce, hard_bounce)
router.post("/webhook/brevo", async (req: Request, res: Response) => {
  try {
    const event = req.body;
    // Brevo webhook payload structure: { event: 'opened' | 'click' | 'delivered' | 'soft_bounce' | 'hard_bounce', 'message-id': '<...>', email: '...' }
    const eventType = event.event || event.eventType;
    const messageId = event["message-id"] || event.messageId;

    if (messageId && isPrismaConnected) {
      const cleanMessageId = messageId.replace(/^<|>$/g, "");
      const log = await prisma.emailLog.findFirst({
        where: {
          OR: [
            { messageId: cleanMessageId },
            { messageId: `<${cleanMessageId}>` },
            { messageId: { contains: cleanMessageId } },
          ],
        },
      });

      if (log) {
        if (eventType === "opened" && log.status !== "opened" && log.status !== "clicked") {
          await prisma.emailLog.update({ where: { id: log.id }, data: { status: "opened", openedAt: new Date() } });
          if (log.campaignId) {
            await prisma.campaign.update({ where: { id: log.campaignId }, data: { opens: { increment: 1 } } }).catch(() => null);
          }
        } else if (eventType === "click") {
          await prisma.emailLog.update({ where: { id: log.id }, data: { status: "clicked" } });
          if (log.campaignId) {
            await prisma.campaign.update({ where: { id: log.campaignId }, data: { clicks: { increment: 1 } } }).catch(() => null);
          }
        } else if (eventType === "delivered") {
          await prisma.emailLog.update({ where: { id: log.id }, data: { status: "delivered" } });
        } else if (eventType === "hard_bounce" || eventType === "soft_bounce") {
          await prisma.emailLog.update({ where: { id: log.id }, data: { status: "bounced", error: event.reason || "Bounced" } });
        }
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("[Tracking] Webhook error:", err.message);
    res.status(200).json({ received: false, error: err.message });
  }
});

// Unsubscribe
router.get("/unsubscribe/:contactId", async (req: Request, res: Response) => {
  const { contactId } = req.params;

  try {
    if (isPrismaConnected) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: "unsubscribed" },
      }).catch(() => null);
    } else if (isMongoConnected) {
      await Contact.findByIdAndUpdate(contactId, { status: "unsubscribed" });
    } else {
      await memoryDb.contacts.findByIdAndUpdate(contactId, { status: "unsubscribed" });
    }
  } catch (err: any) {
    console.error(`[Tracking] Error unsubscribing ${contactId}:`, err.message);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Unsubscribed — SendFlow</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0b0f19; color: #f3f4f6; }
        .card { max-width: 440px; padding: 40px; text-align: center; background: #111827; border: 1px solid #374151; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h1 { margin-top: 0; font-size: 22px; color: #fff; }
        p { color: #9ca3af; font-size: 14px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>You have been unsubscribed</h1>
        <p>You will no longer receive marketing and campaign emails from this sender.</p>
        <p>If this was a mistake, you can resubscribe anytime from your account settings.</p>
      </div>
    </body>
    </html>
  `);
});

export default router;
