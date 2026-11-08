import { Router, Request, Response } from "express";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { Template } from "../models/Template.js";
import { EmailLog } from "../models/EmailLog.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail, compileTemplate } from "../services/emailService.js";
import { getAuthUserId, mapWithUnderscoreId, formatWithUnderscoreId } from "../utils/authHelper.js";
import { STARTER_TEMPLATES } from "../utils/starterTemplates.js";

const router = Router();

// GET all templates
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);

    if (isPrismaConnected) {
      let list = await prisma.template.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      // Auto-seed starter templates if user has none
      if (list.length === 0) {
        try {
          await prisma.template.createMany({
            data: STARTER_TEMPLATES.map((t) => ({
              userId,
              name: t.name,
              category: t.category,
              subject: t.subject,
              html: t.html,
            })),
          });
          list = await prisma.template.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
          });
        } catch (e: any) {
          console.warn("[Templates] Auto-seed error:", e.message);
        }
      }

      return res.json(mapWithUnderscoreId(list));
    }

    if (isMongoConnected) {
      let templates = await Template.find().sort({ createdAt: -1 });
      if (templates.length === 0) {
        await Template.insertMany(STARTER_TEMPLATES);
        templates = await Template.find().sort({ createdAt: -1 });
      }
      return res.json(templates);
    }

    let templates = await memoryDb.templates.find();
    if (templates.length === 0) {
      for (const t of STARTER_TEMPLATES) {
        await memoryDb.templates.create(t);
      }
      templates = await memoryDb.templates.find();
    }
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST seed or restore starter templates
router.post("/seed", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);

    if (isPrismaConnected) {
      // Find existing template names to avoid exact duplicates
      const existing = await prisma.template.findMany({
        where: { userId },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((x) => x.name.toLowerCase()));

      const toAdd = STARTER_TEMPLATES.filter(
        (t) => !existingNames.has(t.name.toLowerCase())
      );

      if (toAdd.length > 0) {
        await prisma.template.createMany({
          data: toAdd.map((t) => ({
            userId,
            name: t.name,
            category: t.category,
            subject: t.subject,
            html: t.html,
          })),
        });
      }

      const all = await prisma.template.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return res.json({
        message: `Added ${toAdd.length} starter templates`,
        templates: mapWithUnderscoreId(all),
      });
    }

    res.json({ message: "Seeded starter templates", count: STARTER_TEMPLATES.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create template
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { name, category, subject, html } = req.body;
    if (!name || !subject || !html) {
      return res.status(400).json({ error: "Name, subject and html content are required" });
    }

    const payload = {
      name: name.trim(),
      category: category || "Marketing",
      subject: subject.trim(),
      html,
    };

    if (isPrismaConnected) {
      const created = await prisma.template.create({
        data: {
          userId,
          ...payload,
        },
      });
      return res.status(201).json(formatWithUnderscoreId(created));
    }

    let created: any;
    if (isMongoConnected) {
      created = await Template.create(payload);
    } else {
      created = await memoryDb.templates.create(payload);
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update template
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, category, subject, html } = req.body;

    if (isPrismaConnected) {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (category !== undefined) data.category = category;
      if (subject !== undefined) data.subject = subject;
      if (html !== undefined) data.html = html;

      const updated = await prisma.template.update({
        where: { id },
        data,
      });
      return res.json(formatWithUnderscoreId(updated));
    }

    const patch: any = {};
    if (name !== undefined) patch.name = name;
    if (category !== undefined) patch.category = category;
    if (subject !== undefined) patch.subject = subject;
    if (html !== undefined) patch.html = html;

    let updated: any;
    if (isMongoConnected) {
      updated = await Template.findByIdAndUpdate(id, patch, { new: true });
    } else {
      updated = await memoryDb.templates.findByIdAndUpdate(id, patch);
    }

    if (!updated) return res.status(404).json({ error: "Template not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE template
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      await prisma.template.delete({ where: { id } }).catch(() => null);
      return res.json({ message: "Template deleted", id });
    }

    let deleted: any;
    if (isMongoConnected) {
      deleted = await Template.findByIdAndDelete(id);
    } else {
      deleted = await memoryDb.templates.findByIdAndDelete(id);
    }
    if (!deleted) return res.status(404).json({ error: "Template not found" });
    res.json({ message: "Template deleted", id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Preview template with variables
router.post("/preview", (req: Request, res: Response) => {
  const { html, variables } = req.body;
  const compiled = compileTemplate(html || "", variables || { name: "Alex Rivers", company: "Acme Corp" });
  res.json({ html: compiled });
});

// POST Send test email using this template
router.post("/:id/test-send", async (req: Request, res: Response) => {
  try {
    const { toEmail, recipientName, cc, bcc, variables } = req.body;
    if (!toEmail) return res.status(400).json({ error: "toEmail is required" });

    const userId = await getAuthUserId(req);

    let tpl: any;
    if (isPrismaConnected) {
      tpl = await prisma.template.findUnique({ where: { id: req.params.id } });
    } else if (isMongoConnected) {
      tpl = await Template.findById(req.params.id);
    } else {
      tpl = await memoryDb.templates.findById(req.params.id);
    }

    if (!tpl) return res.status(404).json({ error: "Template not found" });

    const sendRes = await sendEmail({
      to: toEmail,
      recipientName: recipientName || variables?.name || "Recipient",
      cc,
      bcc,
      subject: `[TEMPLATE] ${tpl.subject}`,
      html: tpl.html,
      variables,
    });

    if (isPrismaConnected) {
      await prisma.emailLog.create({
        data: {
          userId,
          recipientEmail: String(toEmail).trim(),
          recipientName: recipientName || variables?.name || "Recipient",
          cc: Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc) : null),
          bcc: Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc) : null),
          subject: `[TEMPLATE] ${tpl.subject}`,
          status: sendRes.success ? "sent" : "failed",
          messageId: sendRes.messageId || null,
          error: sendRes.error || null,
        },
      }).catch(() => null);
    }

    res.json({
      success: sendRes.success,
      message: sendRes.success ? `Template delivered to ${toEmail}` : `Failed: ${sendRes.error}`,
      previewUrl: sendRes.previewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
