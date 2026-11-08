import { isMongoConnected } from "../config/db.js";
import { Workflow } from "../models/Workflow.js";
import { Contact } from "../models/Contact.js";
import { EmailLog } from "../models/EmailLog.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail } from "./emailService.js";
import { enqueueJob } from "./queueService.js";

// Parse delay text into milliseconds
export function parseDelay(text: string): number {
  const lower = text.toLowerCase();
  const numMatch = lower.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 1;

  if (lower.includes("second")) return num * 1000;
  if (lower.includes("minute")) return num * 60 * 1000;
  if (lower.includes("hour")) return num * 60 * 60 * 1000;
  if (lower.includes("week")) return num * 7 * 24 * 60 * 60 * 1000;
  // Default to days
  return num * 24 * 60 * 60 * 1000;
}

export async function triggerWorkflows(triggerType: "contact_added" | "tag_added" | "manual", contactId: string, filterTag?: string) {
  let workflows: any[] = [];
  if (isMongoConnected) {
    workflows = await Workflow.find({ isActive: true });
  } else {
    workflows = await memoryDb.workflows.find({ isActive: true });
  }

  for (const wf of workflows) {
    // Check if workflow matches trigger
    const triggerNode = wf.nodes?.find((n: any) => n.data?.kind === "trigger");
    if (!triggerNode) continue;

    if (triggerType === "tag_added" && filterTag && wf.trigger?.tag && wf.trigger.tag !== filterTag) {
      continue;
    }

    console.log(`[WorkflowEngine] Triggering workflow "${wf.name}" for contact ${contactId}`);
    
    // Increment executions count
    if (isMongoConnected) {
      await Workflow.findByIdAndUpdate(wf._id, { $inc: { executionsCount: 1 } });
    } else {
      await memoryDb.workflows.findByIdAndUpdate(wf._id, { executionsCount: (wf.executionsCount || 0) + 1 });
    }

    // Find children of trigger node
    const outgoingEdges = wf.edges?.filter((e: any) => e.source === triggerNode.id) || [];
    for (const edge of outgoingEdges) {
      await executeWorkflowStep(String(wf._id), contactId, edge.target);
    }
  }
}

export async function executeWorkflowStep(workflowId: string, contactId: string, nodeId: string) {
  let wf: any;
  let contact: any;

  if (isMongoConnected) {
    wf = await Workflow.findById(workflowId);
    contact = await Contact.findById(contactId);
  } else {
    wf = await memoryDb.workflows.findById(workflowId);
    contact = await memoryDb.contacts.findById(contactId);
  }

  if (!wf || !contact) {
    console.error(`[WorkflowEngine] Workflow or Contact not found for step execution (${workflowId}, ${contactId})`);
    return;
  }

  const currentNode = wf.nodes?.find((n: any) => n.id === nodeId);
  if (!currentNode) {
    console.error(`[WorkflowEngine] Node ${nodeId} not found in workflow ${wf.name}`);
    return;
  }

  const kind = currentNode.data?.kind;
  const text = currentNode.data?.text || "";

  console.log(`[WorkflowEngine] Executing node [${kind}] "${text}" for ${contact.email}`);

  // Handle Node Kind
  if (kind === "email") {
    // 1. Create Email Log
    let log: any;
    const subject = text.includes("Welcome") ? `Welcome to SendFlow, ${contact.name}!` : `Update: ${text}`;
    const html = `<h2>Hi ${contact.name},</h2><p>This is an automated message: <strong>${text}</strong>.</p><p><a href="https://sendflow.app">Visit Dashboard</a></p>`;

    if (isMongoConnected) {
      log = await EmailLog.create({
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject,
        workflowId: wf._id,
        contactId: contact._id,
        status: "queued",
      });
    } else {
      log = await memoryDb.emailLogs.create({
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject,
        workflowId: wf._id,
        contactId: contact._id,
        status: "queued",
      });
    }

    // 2. Send email
    const result = await sendEmail({
      to: contact.email,
      recipientName: contact.name,
      subject,
      html,
      logId: String(log._id),
      contactId: String(contact._id),
      variables: {
        name: contact.name,
        company: contact.company || "SendFlow",
        email: contact.email,
      },
    });

    if (isMongoConnected) {
      await EmailLog.findByIdAndUpdate(log._id, {
        status: result.success ? "sent" : "failed",
        messageId: result.messageId,
      });
    } else {
      await memoryDb.emailLogs.findByIdAndUpdate(log._id, {
        status: result.success ? "sent" : "failed",
        messageId: result.messageId,
      });
    }

    // Continue to next nodes
    const outgoing = wf.edges?.filter((e: any) => e.source === nodeId) || [];
    for (const edge of outgoing) {
      await executeWorkflowStep(workflowId, contactId, edge.target);
    }
  } else if (kind === "delay") {
    // Delay step: wait before triggering child nodes
    const delayMs = parseDelay(text);
    console.log(`[WorkflowEngine] Pausing for ${delayMs}ms before next step`);

    const outgoing = wf.edges?.filter((e: any) => e.source === nodeId) || [];
    for (const edge of outgoing) {
      await enqueueJob(
        {
          type: "WORKFLOW_STEP",
          workflowId,
          contactId,
          nodeId: edge.target,
        },
        delayMs
      );
    }
  } else if (kind === "tag") {
    // Add tag to contact
    const tagToAdd = text.replace(/^add tag\s*/i, "").trim();
    if (tagToAdd) {
      const currentTags = new Set(contact.tags || []);
      currentTags.add(tagToAdd);
      const updatedTags = Array.from(currentTags);

      if (isMongoConnected) {
        await Contact.findByIdAndUpdate(contact._id, { tags: updatedTags });
      } else {
        await memoryDb.contacts.findByIdAndUpdate(contact._id, { tags: updatedTags });
      }
      console.log(`[WorkflowEngine] Tagged ${contact.email} with "${tagToAdd}"`);
    }

    // Continue to next nodes
    const outgoing = wf.edges?.filter((e: any) => e.source === nodeId) || [];
    for (const edge of outgoing) {
      await executeWorkflowStep(workflowId, contactId, edge.target);
    }
  } else if (kind === "condition") {
    // Condition step: branch true vs false
    let conditionMet = true;
    if (text.toLowerCase().includes("opened")) {
      // Check if contact has opened any email from this workflow
      let openedLog: any;
      if (isMongoConnected) {
        openedLog = await EmailLog.findOne({
          contactId: contact._id,
          workflowId: wf._id,
          status: { $in: ["opened", "clicked"] },
        });
      } else {
        const logs = await memoryDb.emailLogs.find();
        openedLog = logs.find(
          (l: any) =>
            String(l.contactId) === String(contact._id) &&
            String(l.workflowId) === String(wf._id) &&
            ["opened", "clicked"].includes(l.status)
        );
      }
      conditionMet = Boolean(openedLog);
    }

    const outgoing = wf.edges?.filter((e: any) => e.source === nodeId) || [];
    // If condition node has multiple outgoing edges, branch:
    if (outgoing.length > 0) {
      // Target the first child if condition met, or second if not
      const targetEdge = conditionMet ? outgoing[0] : (outgoing[1] || outgoing[0]);
      if (targetEdge) {
        await executeWorkflowStep(workflowId, contactId, targetEdge.target);
      }
    }
  }
}

