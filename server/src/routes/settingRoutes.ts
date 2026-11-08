import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import { isMongoConnected } from "../config/db.js";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { Setting } from "../models/Setting.js";
import { EmailLog } from "../models/EmailLog.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail, getActiveSettings } from "../services/emailService.js";
import { getAuthUserId } from "../utils/authHelper.js";

const router = Router();

// GET current settings
router.get("/", async (req: Request, res: Response) => {
  try {
    const settings = await getActiveSettings();
    // Mask API key and SMTP password for security
    const sanitized = {
      ...JSON.parse(JSON.stringify(settings)),
      brevoApiKey: settings.brevoApiKey ? `${settings.brevoApiKey.slice(0, 8)}••••••••` : "",
      smtp: {
        ...settings.smtp,
        pass: settings.smtp?.pass ? "••••••••" : "",
      },
    };
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update settings
router.put("/", async (req: Request, res: Response) => {
  try {
    const { provider, brevoApiKey, smtp, fromEmail, fromName, apiBaseUrl, appUrl } = req.body;
    const patch: any = {};
    if (provider) patch.provider = provider;
    if (brevoApiKey !== undefined && !brevoApiKey.includes("•••")) patch.brevoApiKey = brevoApiKey;
    if (fromEmail) patch.fromEmail = fromEmail;
    if (fromName) patch.fromName = fromName;
    if (apiBaseUrl) patch.apiBaseUrl = apiBaseUrl;
    if (appUrl) patch.appUrl = appUrl;

    if (smtp) {
      patch.smtp = {
        host: smtp.host || "",
        port: parseInt(smtp.port || "587", 10),
        user: smtp.user || "",
        secure: Boolean(smtp.secure),
      };
      if (smtp.pass && !smtp.pass.includes("•••")) {
        patch.smtp.pass = smtp.pass;
      }
    }

    let updated: any;
    if (isPrismaConnected) {
      const userId = await getAuthUserId(req).catch(() => null);
      const existingPrisma = await prisma.setting.findFirst({
        where: userId ? { userId } : undefined,
      });

      const prismaData: any = {};
      if (patch.provider) prismaData.provider = patch.provider;
      if (patch.brevoApiKey) prismaData.brevoApiKey = patch.brevoApiKey;
      if (patch.fromEmail) prismaData.fromEmail = patch.fromEmail;
      if (patch.fromName) prismaData.fromName = patch.fromName;
      if (patch.apiBaseUrl) prismaData.apiBaseUrl = patch.apiBaseUrl;
      if (patch.appUrl) prismaData.appUrl = patch.appUrl;
      if (patch.smtp) {
        prismaData.smtpHost = patch.smtp.host;
        prismaData.smtpPort = patch.smtp.port;
        prismaData.smtpUser = patch.smtp.user;
        if (patch.smtp.pass) prismaData.smtpPass = patch.smtp.pass;
        prismaData.smtpSecure = patch.smtp.secure;
      }

      if (existingPrisma) {
        updated = await prisma.setting.update({
          where: { id: existingPrisma.id },
          data: prismaData,
        });
      } else if (userId) {
        updated = await prisma.setting.create({
          data: {
            userId,
            ...prismaData,
          },
        });
      }
    }

    if (isMongoConnected) {
      const existing = await Setting.findOne();
      if (existing) {
        if (!patch.smtp?.pass && existing.smtp?.pass) {
          patch.smtp = { ...patch.smtp, pass: existing.smtp.pass };
        }
        if (!patch.brevoApiKey && existing.brevoApiKey) {
          patch.brevoApiKey = existing.brevoApiKey;
        }
        const mongoUpdated = await Setting.findByIdAndUpdate(existing._id, patch, { new: true });
        if (!updated) updated = mongoUpdated;
      } else {
        const mongoCreated = await Setting.create(patch);
        if (!updated) updated = mongoCreated;
      }
    } else if (!isPrismaConnected) {
      const all = await memoryDb.settings.find();
      if (all.length > 0) {
        updated = await memoryDb.settings.findByIdAndUpdate(all[0]._id, patch);
      } else {
        updated = await memoryDb.settings.create(patch);
      }
    }

    res.json({ message: "Settings saved successfully", updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST test provider connection
router.post("/test-connection", async (req: Request, res: Response) => {
  try {
    const { provider, brevoApiKey, smtp } = req.body;

    if (provider === "brevo" && brevoApiKey) {
      const key = brevoApiKey.includes("•••") ? (await getActiveSettings()).brevoApiKey : brevoApiKey;
      const resp = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": key || "" },
      });
      if (!resp.ok) {
        const err = await resp.json();
        return res.status(400).json({ error: err.message || "Invalid Brevo API Key" });
      }
      const data = await resp.json();
      if (data.relay?.enabled === false) {
        return res.json({
          success: true,
          warning: true,
          message: `Connected to Brevo (${data.email}), but Brevo Transactional Relay is DISABLED on this account. To send emails, please activate the Transactional platform in your Brevo dashboard or use Custom SMTP (e.g. Gmail App Password).`,
        });
      }
      return res.json({ success: true, message: `Connected to Brevo account: ${data.email}` });
    }

    if (provider === "smtp" && smtp?.host) {
      const cleanPass = String(smtp.pass || "").replace(/\s+/g, "");
      const isGmail = (smtp.host || "").toLowerCase().includes("gmail");
      const transportOpts: any = isGmail
        ? {
            service: "gmail",
            auth: {
              user: smtp.user,
              pass: cleanPass,
            },
          }
        : {
            host: smtp.host,
            port: smtp.port || 587,
            secure: Boolean(smtp.secure),
            auth: {
              user: smtp.user,
              pass: cleanPass,
            },
            tls: { rejectUnauthorized: false },
          };

      const transporter = nodemailer.createTransport(transportOpts);
      await transporter.verify();
      return res.json({ success: true, message: `SMTP server (${smtp.host}) verified and connected!` });
    }

    return res.json({ success: true, message: "Ethereal test sandbox ready (no external credentials needed)" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Connection test failed" });
  }
});

// POST send verification test email
router.post("/test-email", async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: "Recipient email is required" });

    let log: any;
    if (isMongoConnected) {
      log = await EmailLog.create({
        recipientEmail: to,
        recipientName: "Test User",
        subject: "🎉 SendFlow Studio Connection Test",
        status: "queued",
      });
    } else {
      log = await memoryDb.emailLogs.create({
        recipientEmail: to,
        recipientName: "Test User",
        subject: "🎉 SendFlow Studio Connection Test",
        status: "queued",
      });
    }

    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">🚀 SendFlow Studio is Connected!</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Congratulations! Your email delivery system is properly configured and operational.
        </p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #4b5563;"><strong>Delivery Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #4b5563;"><strong>Tracking:</strong> Real-time opens and clicks enabled</p>
        </div>
        <p style="text-align: center; margin-top: 24px; color: #4f46e5; font-weight: 600;">
          Mailora Email Delivery Network &bull; Verified
        </p>
      </div>
    `;

    const result = await sendEmail({
      to,
      recipientName: "SendFlow User",
      subject: "🎉 SendFlow Studio Connection Test",
      html: testHtml,
      logId: String(log._id),
      variables: {
        name: "SendFlow User",
        email: to,
        company: "SendFlow Studio",
      },
    });

    if (result.success) {
      res.json({
        message: "Test email dispatched successfully!",
        previewUrl: result.previewUrl,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({ error: result.error || "Failed to deliver email" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

