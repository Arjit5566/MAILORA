import { Router, Request, Response } from "express";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { isMongoConnected } from "../config/db.js";
import { Workflow } from "../models/Workflow.js";
import { Contact } from "../models/Contact.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail } from "../services/emailService.js";
import { getAuthUserId, mapWithUnderscoreId, formatWithUnderscoreId } from "../utils/authHelper.js";

const router = Router();

// GET all workflows
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);

    if (isPrismaConnected) {
      const list = await prisma.workflow.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return res.json(mapWithUnderscoreId(list));
    }

    if (isMongoConnected) {
      const workflows = await Workflow.find().sort({ createdAt: -1 });
      return res.json(workflows);
    }

    const workflows = await memoryDb.workflows.find();
    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single workflow
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      const wf = await prisma.workflow.findUnique({ where: { id } });
      if (!wf) return res.status(404).json({ error: "Workflow not found" });
      return res.json(formatWithUnderscoreId(wf));
    }

    let workflow: any;
    if (isMongoConnected) {
      workflow = await Workflow.findById(id);
    } else {
      workflow = await memoryDb.workflows.findById(id);
    }
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    res.json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create workflow
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = await getAuthUserId(req);
    const { name, description, nodes, edges, trigger, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const triggerStr = typeof trigger === "string" ? trigger : trigger?.type || "new_contact";

    if (isPrismaConnected) {
      const created = await prisma.workflow.create({
        data: {
          userId,
          name: name.trim(),
          description: description || "",
          nodes: nodes || [],
          edges: edges || [],
          trigger: triggerStr,
          isActive: isActive !== undefined ? isActive : true,
          executionsCount: 0,
        },
      });
      return res.status(201).json(formatWithUnderscoreId(created));
    }

    const payload = {
      name: name.trim(),
      description: description || "",
      nodes: nodes || [],
      edges: edges || [],
      trigger: trigger || { type: "contact_added" },
      isActive: isActive !== undefined ? isActive : true,
      executionsCount: 0,
    };

    let created: any;
    if (isMongoConnected) {
      created = await Workflow.create(payload);
    } else {
      created = await memoryDb.workflows.create(payload);
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update workflow (save graph changes)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const userId = await getAuthUserId(req);
    const { name, description, nodes, edges, trigger, isActive } = req.body;

    if (isPrismaConnected) {
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (nodes !== undefined) data.nodes = nodes;
      if (edges !== undefined) data.edges = edges;
      if (trigger !== undefined) {
        data.trigger = typeof trigger === "string" ? trigger : trigger?.type || "new_contact";
      }
      if (isActive !== undefined) data.isActive = isActive;

      // Check if workflow exists, otherwise create it
      const existing = await prisma.workflow.findUnique({ where: { id } }).catch(() => null);
      if (!existing) {
        const created = await prisma.workflow.create({
          data: {
            id,
            userId,
            name: name || "Automation Workflow",
            description: description || "",
            nodes: nodes || [],
            edges: edges || [],
            trigger: typeof trigger === "string" ? trigger : trigger?.type || "new_contact",
            isActive: isActive !== undefined ? isActive : true,
            executionsCount: 0,
          },
        });
        return res.json(formatWithUnderscoreId(created));
      }

      const updated = await prisma.workflow.update({
        where: { id },
        data,
      });
      return res.json(formatWithUnderscoreId(updated));
    }

    const patch: any = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (nodes !== undefined) patch.nodes = nodes;
    if (edges !== undefined) patch.edges = edges;
    if (trigger !== undefined) patch.trigger = trigger;
    if (isActive !== undefined) patch.isActive = isActive;

    let updated: any;
    if (isMongoConnected) {
      updated = await Workflow.findByIdAndUpdate(id, patch, { new: true });
    } else {
      updated = await memoryDb.workflows.findByIdAndUpdate(id, patch);
    }

    if (!updated) return res.status(404).json({ error: "Workflow not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE workflow
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      await prisma.workflow.delete({ where: { id } }).catch(() => null);
      return res.json({ message: "Workflow deleted", id });
    }

    if (isMongoConnected) {
      await Workflow.findByIdAndDelete(id);
    } else {
      await memoryDb.workflows.findByIdAndDelete(id);
    }
    res.json({ message: "Workflow deleted", id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST toggle active/paused
router.post("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (isPrismaConnected) {
      const current = await prisma.workflow.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ error: "Workflow not found" });

      const updated = await prisma.workflow.update({
        where: { id },
        data: { isActive: !current.isActive },
      });
      return res.json(formatWithUnderscoreId(updated));
    }

    let wf: any;
    if (isMongoConnected) {
      wf = await Workflow.findById(id);
      if (!wf) return res.status(404).json({ error: "Workflow not found" });
      wf.isActive = !wf.isActive;
      await wf.save();
    } else {
      wf = await memoryDb.workflows.findById(id);
      if (!wf) return res.status(404).json({ error: "Workflow not found" });
      wf = await memoryDb.workflows.findByIdAndUpdate(id, { isActive: !wf.isActive });
    }

    res.json(wf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Trigger workflow execution for specific recipient
router.post("/:id/trigger", async (req: Request, res: Response) => {
  try {
    const { contactId, email, name, cc, bcc } = req.body;
    const userId = await getAuthUserId(req);
    const id = req.params.id;

    let targetEmail = "";
    let targetName = name || "Valued Contact";
    let targetContactId = contactId;

    if (contactId) {
      if (isPrismaConnected) {
        const c = await prisma.contact.findFirst({ where: { userId, id: contactId } });
        if (c) {
          targetEmail = c.email;
          targetName = c.name;
        }
      } else if (isMongoConnected) {
        const c = await Contact.findById(contactId);
        if (c) {
          targetEmail = c.email;
          targetName = c.name;
        }
      }
    }

    if (!targetEmail && email) {
      targetEmail = String(email).trim().toLowerCase();
    }

    // Fallback: If no recipient specified, target current user's email for easy testing
    if (!targetEmail) {
      if (isPrismaConnected) {
        const u = await prisma.user.findUnique({ where: { id: userId } });
        if (u?.email) {
          targetEmail = u.email;
          targetName = u.name || "Test User";
        }
      }
    }

    if (!targetEmail || !targetEmail.includes("@")) {
      targetEmail = "arjitripathi0607@gmail.com";
      targetName = "Arjit Tripathi";
    }

    let wf: any;
    if (isPrismaConnected) {
      wf = await prisma.workflow.findUnique({ where: { id } });
      if (!wf) {
        wf = await prisma.workflow.findFirst({ where: { userId } });
      }
      if (!wf) {
        wf = await prisma.workflow.create({
          data: {
            userId,
            name: "Customer Onboarding Journey",
            description: "Automated welcome series with engagement checks",
            trigger: "contact_added",
            isActive: true,
            nodes: [
              { id: "1", type: "flow", position: { x: 200, y: 20 }, data: { kind: "trigger", text: "Contact signs up" } },
              { id: "2", type: "flow", position: { x: 30, y: 148 }, data: { kind: "email", text: "welcome to my websitez" } },
              { id: "3", type: "flow", position: { x: 200, y: 240 }, data: { kind: "delay", text: "Wait 3 days" } },
              { id: "4", type: "flow", position: { x: 394, y: 350 }, data: { kind: "condition", text: "Opened welcome?" } },
              { id: "5", type: "flow", position: { x: 40, y: 470 }, data: { kind: "email", text: "Day 3 tips" } },
              { id: "6", type: "flow", position: { x: 360, y: 470 }, data: { kind: "tag", text: "needs-nudge" } },
            ],
            edges: [
              { id: "1-2", source: "1", target: "2", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 } },
              { id: "2-3", source: "2", target: "3", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 } },
              { id: "3-4", source: "3", target: "4", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 } },
              { id: "4-5", source: "4", target: "5", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 } },
              { id: "4-6", source: "4", target: "6", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 } },
            ],
            executionsCount: 0,
          },
        });
      }
    } else if (isMongoConnected) {
      wf = await Workflow.findById(id);
    }

    if (!wf) return res.status(404).json({ error: "Workflow not found" });

    // Send the initial step email for this workflow to the specified recipient
    const emailNode = (wf.nodes as any[])?.find((n: any) => n.data?.kind === "email");
    const nodeText = emailNode?.data?.text || "Welcome email";
    const subject = nodeText.includes("Welcome") ? `Welcome aboard, ${targetName}!` : `Workflow Update: ${nodeText}`;
    const html = `<h2>Hello ${targetName},</h2><p>This automated message was triggered for you: <strong>${nodeText}</strong>.</p><p><a href="https://sendflow.app">View Dashboard</a></p>`;

    let logId: string | undefined;
    if (isPrismaConnected) {
      const log = await prisma.emailLog.create({
        data: {
          userId,
          recipientEmail: targetEmail,
          recipientName: targetName,
          cc: Array.isArray(cc) ? cc.join(", ") : (cc ? String(cc) : null),
          bcc: Array.isArray(bcc) ? bcc.join(", ") : (bcc ? String(bcc) : null),
          subject,
          workflowId: wf?.id || id,
          contactId: targetContactId,
          status: "queued",
        },
      });
      logId = log.id;

      if (wf?.id) {
        await prisma.workflow.update({
          where: { id: wf.id },
          data: { executionsCount: { increment: 1 } },
        }).catch(() => null);
      }
    }

    const sendRes = await sendEmail({
      to: targetEmail,
      recipientName: targetName,
      cc,
      bcc,
      subject,
      html,
      logId,
      contactId: targetContactId,
    });

    if (isPrismaConnected && logId) {
      await prisma.emailLog.update({
        where: { id: logId },
        data: { status: sendRes.success ? "sent" : "failed", messageId: sendRes.messageId, error: sendRes.error },
      }).catch(() => null);
    }

    res.json({
      success: sendRes.success,
      message: `Workflow executed exclusively for ${targetEmail}`,
      previewUrl: sendRes.previewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
