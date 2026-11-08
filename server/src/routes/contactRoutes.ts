import { Router, Request, Response } from "express";
import { Readable } from "stream";
import csvParser from "csv-parser";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { Contact } from "../models/Contact.js";
import { memoryDb } from "../utils/memoryStore.js";
import { upload } from "../middleware/upload.js";
import { triggerWorkflows } from "../services/workflowEngine.js";
import { getAuthUserId, mapWithUnderscoreId, formatWithUnderscoreId } from "../utils/authHelper.js";

const router = Router();

// GET contacts with optional filter
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { q, tag } = req.query;

    if (isPrismaConnected) {
      const where: any = { userId };
      if (tag && tag !== "all") {
        where.tags = { has: String(tag) };
      }
      if (q) {
        const queryStr = String(q);
        where.OR = [
          { name: { contains: queryStr, mode: "insensitive" } },
          { email: { contains: queryStr, mode: "insensitive" } },
          { company: { contains: queryStr, mode: "insensitive" } },
        ];
      }

      const list = await prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return res.json(mapWithUnderscoreId(list));
    }

    if (isMongoConnected) {
      const filter: any = {};
      if (tag && tag !== "all") filter.tags = tag;
      if (q) {
        filter.$or = [
          { name: { $regex: q as string, $options: "i" } },
          { email: { $regex: q as string, $options: "i" } },
          { company: { $regex: q as string, $options: "i" } },
        ];
      }
      const contacts = await Contact.find(filter).sort({ createdAt: -1 });
      return res.json(contacts);
    }

    let all = await memoryDb.contacts.find();
    if (tag && tag !== "all") all = all.filter((c: any) => c.tags?.includes(tag));
    if (q) {
      const query = (q as string).toLowerCase();
      all = all.filter(
        (c: any) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query)
      );
    }
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST single contact
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { name, email, company, tags, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanTags = Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(",").map((t: string) => t.trim())
      : [];
    const addedAt = new Date().toISOString().slice(0, 10);

    if (isPrismaConnected) {
      try {
        const created = await prisma.contact.create({
          data: {
            userId,
            name: cleanName,
            email: cleanEmail,
            company: company || "",
            tags: cleanTags,
            status: status || "active",
            addedAt,
          },
        });

        triggerWorkflows("contact_added", created.id).catch(() => {});
        return res.status(201).json(formatWithUnderscoreId(created));
      } catch (err: any) {
        if (err.code === "P2002") {
          return res.status(400).json({ error: "Contact with this email already exists" });
        }
        throw err;
      }
    }

    const payload = {
      name: cleanName,
      email: cleanEmail,
      company: company || "",
      tags: cleanTags,
      status: status || "subscribed",
      addedAt,
    };

    let created: any;
    if (isMongoConnected) {
      created = await Contact.create(payload);
    } else {
      created = await memoryDb.contacts.create(payload);
    }

    triggerWorkflows("contact_added", String(created._id)).catch(() => {});
    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Contact with this email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update contact
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, email, company, tags, status } = req.body;

    if (isPrismaConnected) {
      const data: any = {};
      if (name !== undefined) data.name = name.trim();
      if (email !== undefined) data.email = email.toLowerCase().trim();
      if (company !== undefined) data.company = company;
      if (tags !== undefined) {
        data.tags = Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim());
      }
      if (status !== undefined) data.status = status;

      const updated = await prisma.contact.update({
        where: { id },
        data,
      });
      return res.json(formatWithUnderscoreId(updated));
    }

    const patch: any = {};
    if (name !== undefined) patch.name = name;
    if (email !== undefined) patch.email = email.toLowerCase().trim();
    if (company !== undefined) patch.company = company;
    if (tags !== undefined) patch.tags = Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim());
    if (status !== undefined) patch.status = status;

    let updated: any;
    if (isMongoConnected) {
      updated = await Contact.findByIdAndUpdate(id, patch, { new: true });
    } else {
      updated = await memoryDb.contacts.findByIdAndUpdate(id, patch);
    }

    if (!updated) return res.status(404).json({ error: "Contact not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE single contact
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      await prisma.contact.delete({ where: { id } }).catch(() => null);
      return res.json({ message: "Contact deleted", id });
    }

    if (isMongoConnected) {
      await Contact.findByIdAndDelete(id);
    } else {
      await memoryDb.contacts.findByIdAndDelete(id);
    }
    res.json({ message: "Contact deleted", id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk delete
router.post("/delete-many", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    if (isPrismaConnected) {
      await prisma.contact.deleteMany({
        where: { id: { in: ids } },
      });
      return res.json({ message: `${ids.length} contacts deleted`, count: ids.length });
    }

    if (isMongoConnected) {
      await Contact.deleteMany({ _id: { $in: ids } });
    } else {
      for (const id of ids) {
        await memoryDb.contacts.findByIdAndDelete(id);
      }
    }

    res.json({ message: `${ids.length} contacts deleted`, count: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Bulk Import JSON
router.post("/bulk-import", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "contacts array is required" });
    }

    let added = 0;
    let skipped = 0;

    for (const c of contacts) {
      if (!c.email || !c.name) {
        skipped++;
        continue;
      }

      const email = c.email.trim().toLowerCase();
      const tags = Array.isArray(c.tags)
        ? c.tags
        : c.tags
        ? String(c.tags).split(",").map((t) => t.trim())
        : ["imported"];

      if (isPrismaConnected) {
        try {
          const exists = await prisma.contact.findFirst({
            where: { userId, email },
          });
          if (!exists) {
            await prisma.contact.create({
              data: {
                userId,
                name: c.name.trim(),
                email,
                company: c.company || "",
                tags,
                status: c.status || "active",
                addedAt: new Date().toISOString().slice(0, 10),
              },
            });
            added++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      } else if (isMongoConnected) {
        try {
          const exists = await Contact.findOne({ email });
          if (!exists) {
            await Contact.create({
              name: c.name.trim(),
              email,
              company: c.company || "",
              tags,
              status: c.status || "subscribed",
              addedAt: new Date().toISOString().slice(0, 10),
            });
            added++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      } else {
        const all = await memoryDb.contacts.find();
        const exists = all.find((x: any) => x.email === email);
        if (!exists) {
          await memoryDb.contacts.create({
            name: c.name.trim(),
            email,
            company: c.company || "",
            tags,
            status: c.status || "subscribed",
            addedAt: new Date().toISOString().slice(0, 10),
          });
          added++;
        } else {
          skipped++;
        }
      }
    }

    res.json({
      message: `Import complete: ${added} added, ${skipped} skipped`,
      added,
      skipped,
      total: contacts.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST CSV upload import
router.post("/import-csv", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    if (!req.file) {
      return res.status(400).json({ error: "No CSV file uploaded" });
    }

    const rows: any[] = [];
    const stream = Readable.from(req.file.buffer).pipe(csvParser());

    for await (const row of stream) {
      rows.push(row);
    }

    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      // Find keys case-insensitively
      const rowKeys = Object.keys(row);
      const emailKey = rowKeys.find((k) => /email|e_mail|mail|recipient/i.test(k));
      const email = (emailKey ? String(row[emailKey] || "") : "").trim().toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped++;
        continue;
      }

      const nameKey = rowKeys.find((k) => /^(name|full_name|first_name|contact|user)/i.test(k));
      let name = (nameKey ? String(row[nameKey] || "") : "").trim();
      if (!name) {
        name = email.split("@")[0] || "Subscriber";
      }

      const compKey = rowKeys.find((k) => /company|org|organization|business/i.test(k));
      const company = (compKey ? String(row[compKey] || "") : "").trim();

      const tagsKey = rowKeys.find((k) => /tag/i.test(k));
      const tagsRaw = tagsKey ? String(row[tagsKey] || "") : "";
      const tags = tagsRaw
        ? tagsRaw.split(/[,;|]/).map((t: string) => t.trim()).filter(Boolean)
        : ["imported", "subscriber"];

      if (isPrismaConnected) {
        try {
          const exists = await prisma.contact.findFirst({ where: { userId, email } });
          if (!exists) {
            await prisma.contact.create({
              data: {
                userId,
                name,
                email,
                company: company || undefined,
                tags,
                status: "subscribed",
                addedAt: new Date().toISOString().slice(0, 10),
              },
            });
            added++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      } else if (isMongoConnected) {
        try {
          const exists = await Contact.findOne({ email });
          if (!exists) {
            await Contact.create({
              name,
              email,
              company: company || undefined,
              tags,
              status: "subscribed",
              addedAt: new Date().toISOString().slice(0, 10),
            });
            added++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }
    }

    res.json({
      message: `CSV import completed: ${added} added, ${skipped} skipped`,
      added,
      skipped,
      total: rows.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET export contacts as CSV
router.get("/export/csv", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    let contacts: any[];

    if (isPrismaConnected) {
      contacts = await prisma.contact.findMany({ where: { userId } });
    } else if (isMongoConnected) {
      contacts = await Contact.find();
    } else {
      contacts = await memoryDb.contacts.find();
    }

    const headers = ["Name,Email,Company,Tags,Status,AddedAt"];
    const lines = contacts.map((c: any) => {
      const tagsStr = Array.isArray(c.tags) ? c.tags.join(";") : "";
      return `"${c.name}","${c.email}","${c.company || ""}","${tagsStr}","${c.status}","${c.addedAt || ""}"`;
    });

    const csvContent = [headers, ...lines].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=contacts.csv");
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
