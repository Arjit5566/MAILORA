import { Queue, Worker, Job } from "bullmq";
import { isRedisConnected, getRedisClient } from "../config/redis.js";
import { isMongoConnected } from "../config/db.js";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { Campaign } from "../models/Campaign.js";
import { Contact } from "../models/Contact.js";
import { EmailLog } from "../models/EmailLog.js";
import { ScheduledJob } from "../models/ScheduledJob.js";
import { memoryDb } from "../utils/memoryStore.js";
import { sendEmail } from "./emailService.js";
import { executeWorkflowStep } from "./workflowEngine.js";

export interface CampaignJobData {
  type: "CAMPAIGN_SEND";
  campaignId: string;
}

export interface WorkflowJobData {
  type: "WORKFLOW_STEP";
  workflowId: string;
  contactId: string;
  nodeId: string;
}

export interface ScheduledSendJobData {
  type: "SCHEDULED_SEND";
  scheduledJobId: string;
}

type JobData = CampaignJobData | WorkflowJobData | ScheduledSendJobData;

let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;

// Process a campaign send job
export async function processCampaignJob(campaignId: string) {
  console.log(`[QueueWorker] Starting campaign send for: ${campaignId}`);

  let campaign: any;
  if (isPrismaConnected) {
    campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  } else if (isMongoConnected) {
    campaign = await Campaign.findById(campaignId);
  } else {
    campaign = await memoryDb.campaigns.findById(campaignId);
  }

  if (!campaign) {
    console.error(`[QueueWorker] Campaign not found: ${campaignId}`);
    return;
  }

  // Update status to sending
  if (isPrismaConnected) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "sending" } });
  } else if (isMongoConnected) {
    await Campaign.findByIdAndUpdate(campaignId, { status: "sending" });
  } else {
    await memoryDb.campaigns.findByIdAndUpdate(campaignId, { status: "sending" });
  }

  // Get recipient contacts
  let contacts: any[] = [];
  if (campaign.recipients) {
    try {
      let parsed = typeof campaign.recipients === "string" ? JSON.parse(campaign.recipients) : campaign.recipients;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        contacts = parsed.map((r: any) => ({
          email: String((typeof r === "object" ? r.email : r) || "").trim().toLowerCase(),
          name: typeof r === "object" ? r.name : undefined,
          company: typeof r === "object" ? r.company : undefined,
          id: typeof r === "object" ? r.contactId || r.id : undefined,
        })).filter((r: any) => r.email && r.email.includes("@"));
      }
    } catch {
      // not JSON
    }
  }

  if (contacts.length === 0) {
    if (isPrismaConnected) {
      const where: any = { userId: campaign.userId };
      if (campaign.audience && campaign.audience !== "All subscribers" && campaign.audience !== "All contacts") {
        where.tags = { has: campaign.audience };
      }
      contacts = await prisma.contact.findMany({ where });
    } else if (isMongoConnected) {
      const filter: any = { status: "subscribed" };
      if (campaign.audience && campaign.audience !== "All subscribers") {
        filter.tags = campaign.audience;
      }
      contacts = await Contact.find(filter);
    } else {
      const all = await memoryDb.contacts.find({ status: "subscribed" });
      if (campaign.audience && campaign.audience !== "All subscribers") {
        contacts = all.filter((c: any) => c.tags?.includes(campaign.audience));
      } else {
        contacts = all;
      }
    }
  }

  console.log(`[QueueWorker] Sending to ${contacts.length} recipients for campaign: ${campaign.name}`);

  let sentCount = 0;
  for (const contact of contacts) {
    // Check if campaign was paused during execution
    let currentCampaign: any;
    if (isMongoConnected) {
      currentCampaign = await Campaign.findById(campaignId);
    } else {
      currentCampaign = await memoryDb.campaigns.findById(campaignId);
    }
    if (currentCampaign?.status === "paused") {
      console.log(`[QueueWorker] Campaign ${campaignId} was paused. Halting send loop.`);
      return;
    }

    // 1. Create Email Log
    let log: any;
    if (isPrismaConnected) {
      log = await prisma.emailLog.create({
        data: {
          userId: campaign.userId,
          recipientEmail: contact.email,
          recipientName: contact.name,
          subject: campaign.subject,
          campaignId: campaign.id,
          contactId: contact.id,
          status: "queued",
        },
      });
    } else if (isMongoConnected) {
      log = await EmailLog.create({
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject: campaign.subject,
        campaignId: campaign._id,
        contactId: contact._id,
        status: "queued",
      });
    } else {
      log = await memoryDb.emailLogs.create({
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject: campaign.subject,
        campaignId: campaign._id,
        contactId: contact._id,
        status: "queued",
      });
    }

    // 2. Dispatch email
    const result = await sendEmail({
      to: contact.email,
      recipientName: contact.name,
      subject: campaign.subject,
      html: campaign.html || "<h2>{{name}}</h2><p>Here is your update from SendFlow.</p>",
      logId: String(log.id || log._id),
      contactId: String(contact.id || contact._id),
      variables: {
        name: contact.name,
        company: contact.company || "SendFlow",
        email: contact.email,
      },
    });

    // 3. Update Log status
    const logId = log.id || log._id;
    if (result.success) {
      sentCount++;
      if (isPrismaConnected) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { status: "sent", messageId: result.messageId },
        }).catch(() => null);
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sent: { increment: 1 } },
        }).catch(() => null);
      } else if (isMongoConnected) {
        await EmailLog.findByIdAndUpdate(log._id, {
          status: "sent",
          messageId: result.messageId,
        });
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { sent: 1 },
        });
      } else {
        await memoryDb.emailLogs.findByIdAndUpdate(log._id, {
          status: "sent",
          messageId: result.messageId,
        });
        await memoryDb.campaigns.findByIdAndUpdate(campaignId, {
          sent: (currentCampaign.sent || 0) + 1,
        });
      }
    } else {
      if (isPrismaConnected) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { status: "failed", error: result.error },
        }).catch(() => null);
      } else if (isMongoConnected) {
        await EmailLog.findByIdAndUpdate(log._id, {
          status: "failed",
          error: result.error,
        });
      } else {
        await memoryDb.emailLogs.findByIdAndUpdate(log._id, {
          status: "failed",
          error: result.error,
        });
      }
    }

    // Slight pacing to avoid burst rate-limits
    await new Promise((r) => setTimeout(r, 60));
  }

  // Mark campaign outcome based on actual delivery
  const finalCampaignStatus =
    contacts.length === 0 || sentCount === 0
      ? "failed"
      : sentCount < contacts.length
      ? "partially_sent"
      : "sent";

  if (isPrismaConnected) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: finalCampaignStatus, sent: sentCount },
    }).catch(() => null);
  } else if (isMongoConnected) {
    await Campaign.findByIdAndUpdate(campaignId, { status: finalCampaignStatus, sent: sentCount });
  } else {
    await memoryDb.campaigns.findByIdAndUpdate(campaignId, { status: finalCampaignStatus, sent: sentCount });
  }

  console.log(`[QueueWorker] Campaign ${campaign.name} completed. Status: ${finalCampaignStatus}, Sent: ${sentCount}/${contacts.length}`);
}

// In-Memory Queue Fallback
class InMemoryQueue {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  add(jobId: string, data: JobData, delayMs: number = 0) {
    console.log(`[InMemoryQueue] Enqueued job ${jobId} (Type: ${data.type}) with delay ${delayMs}ms`);
    if (delayMs <= 0) {
      setImmediate(() => this.process(data));
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(jobId);
      this.process(data);
    }, delayMs);

    this.timers.set(jobId, timer);
  }

  cancel(jobId: string) {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
      console.log(`[InMemoryQueue] Cancelled job ${jobId}`);
    }
  }

  private async process(data: JobData) {
    try {
      if (data.type === "CAMPAIGN_SEND") {
        await processCampaignJob(data.campaignId);
      } else if (data.type === "WORKFLOW_STEP") {
        await executeWorkflowStep(data.workflowId, data.contactId, data.nodeId);
      } else if (data.type === "SCHEDULED_SEND") {
        await processScheduledJob(data.scheduledJobId);
      }
    } catch (err: any) {
      console.error(`[InMemoryQueue] Job processing error:`, err.message);
    }
  }
}

export const inMemoryQueue = new InMemoryQueue();

// Scheduled Send Job Handler
export async function processScheduledJob(scheduledJobId: string) {
  console.log(`[QueueWorker] Triggering scheduled send for: ${scheduledJobId}`);

  let job: any;
  if (isPrismaConnected) {
    job = await prisma.scheduledJob.findUnique({ where: { id: scheduledJobId } });
  } else if (isMongoConnected) {
    job = await ScheduledJob.findById(scheduledJobId);
  } else {
    job = await memoryDb.schedules.findById(scheduledJobId);
  }

  if (!job) return;

  // If job was paused or cancelled, do not dispatch
  if (job.status === "cancelled" || job.status === "paused") {
    console.log(`[QueueWorker] Scheduled job ${scheduledJobId} is ${job.status}. Skipping.`);
    return;
  }

  // Mark processing
  if (isPrismaConnected) {
    await prisma.scheduledJob.update({
      where: { id: scheduledJobId },
      data: { status: "processing" },
    }).catch(() => null);
  } else if (isMongoConnected) {
    await ScheduledJob.findByIdAndUpdate(scheduledJobId, { status: "processing" });
  } else {
    await memoryDb.schedules.findByIdAndUpdate(scheduledJobId, { status: "processing" });
  }

  // A. Check if explicit recipients array is stored in JSON
  let explicitRecipients: Array<{ email: string; name?: string; company?: string }> = [];
  if (job.recipients) {
    try {
      let parsed = typeof job.recipients === "string" ? JSON.parse(job.recipients) : job.recipients;
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        explicitRecipients = parsed.map((r: any) => ({
          email: String((typeof r === "object" ? r.email : r) || "").trim().toLowerCase(),
          name: typeof r === "object" ? r.name : undefined,
          company: typeof r === "object" ? r.company : undefined,
        })).filter((r: any) => r.email.includes("@"));
      }
    } catch {
      // not JSON
    }
  }

  // B. Check if linked campaign has explicit recipients
  if (explicitRecipients.length === 0 && job.campaignId) {
    let linkedCampaign: any = null;
    if (isPrismaConnected) {
      linkedCampaign = await prisma.campaign.findUnique({ where: { id: job.campaignId } });
    } else if (isMongoConnected) {
      linkedCampaign = await Campaign.findById(job.campaignId);
    } else {
      linkedCampaign = await memoryDb.campaigns.findById(job.campaignId);
    }

    if (linkedCampaign?.recipients) {
      try {
        let parsed = typeof linkedCampaign.recipients === "string" ? JSON.parse(linkedCampaign.recipients) : linkedCampaign.recipients;
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          explicitRecipients = parsed.map((r: any) => ({
            email: String((typeof r === "object" ? r.email : r) || "").trim().toLowerCase(),
            name: typeof r === "object" ? r.name : undefined,
            company: typeof r === "object" ? r.company : undefined,
          })).filter((r: any) => r.email && r.email.includes("@"));
        }
      } catch {
        // not JSON
      }
    }
  }

  // C. If audience has comma-separated emails or single email
  if (explicitRecipients.length === 0 && job.audience && job.audience.includes("@")) {
    const rawTokens = job.audience.split(/[,;\s]+/).filter((e: string) => e.includes("@"));
    explicitRecipients = rawTokens.map((email: string) => ({
      email: email.trim().toLowerCase(),
      name: email.trim().split("@")[0] || "Recipient",
    }));
  }

  // If explicit recipients are present, send ONLY to those recipients
  if (explicitRecipients.length > 0) {
    console.log(`[QueueWorker] Dispatching scheduled job ${scheduledJobId} to ${explicitRecipients.length} explicit recipient(s)`);
    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;

    for (let i = 0; i < explicitRecipients.length; i++) {
      const target = explicitRecipients[i]!;
      let logId: string | undefined;

      if (isPrismaConnected) {
        try {
          const log = await prisma.emailLog.create({
            data: {
              userId: job.userId,
              recipientEmail: target.email,
              recipientName: target.name || "",
              subject: job.subject || job.title,
              campaignId: job.campaignId,
              status: "queued",
            },
          });
          logId = log.id;
        } catch {
          // ignore log insert collision
        }
      }

      const sendRes = await sendEmail({
        to: target.email,
        recipientName: target.name,
        subject: job.subject || job.title,
        html: job.html || "<p>Hello, this is your scheduled message.</p>",
        logId,
        variables: {
          name: target.name || "Recipient",
          email: target.email,
          company: target.company || "SendFlow",
        },
      });

      if (sendRes.success) {
        sentCount++;
        if (isPrismaConnected && logId) {
          await prisma.emailLog.update({
            where: { id: logId },
            data: { status: "sent", messageId: sendRes.messageId },
          }).catch(() => null);
        }
      } else {
        failedCount++;
        lastError = sendRes.error || "Delivery failed";
        if (isPrismaConnected && logId) {
          await prisma.emailLog.update({
            where: { id: logId },
            data: { status: "failed", error: sendRes.error },
          }).catch(() => null);
        }
      }

      // Pacing delay (80ms)
      if (i < explicitRecipients.length - 1) {
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    const finalStatus = failedCount > 0 && sentCount === 0 ? "failed" : (failedCount > 0 ? "partially_sent" : "sent");
    if (isPrismaConnected) {
      await prisma.scheduledJob.update({
        where: { id: scheduledJobId },
        data: {
          status: finalStatus,
          executedAt: new Date(),
          sentCount,
          failedCount,
          error: lastError,
        },
      }).catch(() => null);

      if (job.campaignId) {
        await prisma.campaign.update({
          where: { id: job.campaignId },
          data: { status: finalStatus, sent: sentCount },
        }).catch(() => null);
      }
    } else if (isMongoConnected) {
      await ScheduledJob.findByIdAndUpdate(scheduledJobId, { status: finalStatus, error: lastError });
    }
    return;
  }

  // C. Fallback: Tag-based campaign send
  let newCampaign: any;
  const campaignData = {
    name: `Scheduled: ${job.title}`,
    subject: job.subject || job.title,
    html: job.html || "<p>Hello {{name}}, this is your scheduled message.</p>",
    audience: job.audience || "All subscribers",
    status: "sending",
    date: new Date().toISOString().slice(0, 10),
  };

  if (isPrismaConnected) {
    newCampaign = await prisma.campaign.create({
      data: {
        userId: job.userId,
        ...campaignData,
      },
    });
    await processCampaignJob(newCampaign.id);
    const updatedCampaign = await prisma.campaign.findUnique({ where: { id: newCampaign.id } });
    const finalJobStatus = (updatedCampaign?.status === "failed" || (updatedCampaign?.sent ?? 0) === 0) ? "failed" : "sent";
    await prisma.scheduledJob.update({
      where: { id: scheduledJobId },
      data: {
        status: finalJobStatus,
        executedAt: new Date(),
        campaignId: newCampaign.id,
        sentCount: updatedCampaign?.sent ?? 0,
        failedCount: finalJobStatus === "failed" ? 1 : 0,
        error: finalJobStatus === "failed" ? "No recipients were reached or delivery failed" : null,
      },
    }).catch(() => null);
  } else if (isMongoConnected) {
    newCampaign = await Campaign.create(campaignData);
    await processCampaignJob(String(newCampaign._id));
    await ScheduledJob.findByIdAndUpdate(scheduledJobId, { status: "sent" });
  } else {
    newCampaign = await memoryDb.campaigns.create(campaignData);
    await processCampaignJob(String(newCampaign._id));
    await memoryDb.schedules.findByIdAndUpdate(scheduledJobId, { status: "sent" });
  }
}

// Queue initialization
export async function initQueueSystem() {
  const redis = getRedisClient();

  if (isRedisConnected && redis) {
    try {
      bullQueue = new Queue("sendflow-jobs", { connection: redis });
      bullWorker = new Worker(
        "sendflow-jobs",
        async (job: Job<JobData>) => {
          const { data } = job;
          if (data.type === "CAMPAIGN_SEND") {
            await processCampaignJob(data.campaignId);
          } else if (data.type === "WORKFLOW_STEP") {
            await executeWorkflowStep(data.workflowId, data.contactId, data.nodeId);
          } else if (data.type === "SCHEDULED_SEND") {
            await processScheduledJob(data.scheduledJobId);
          }
        },
        { connection: redis }
      );

      bullWorker.on("completed", (job) => {
        console.log(`[BullMQ] Job ${job.id} completed successfully`);
      });

      bullWorker.on("failed", (job, err) => {
        console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);
      });

      console.log(`[Queue] BullMQ initialized with Redis connection`);
      return;
    } catch (err: any) {
      console.warn(`[Queue] BullMQ init failed: ${err.message}. Using in-memory queue fallback.`);
    }
  }

  console.log(`[Queue] Running with reactive in-memory queue dispatcher`);
}

// Unified Queue dispatch API
export async function enqueueJob(data: JobData, delayMs: number = 0, customJobId?: string) {
  const jobId = customJobId || `${data.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (bullQueue && isRedisConnected) {
    try {
      await bullQueue.add(data.type, data, {
        delay: delayMs,
        jobId,
        removeOnComplete: true,
      });
      return jobId;
    } catch (err: any) {
      console.warn(`[Queue] BullMQ add failed (${err.message}), falling back to in-memory queue`);
    }
  }

  inMemoryQueue.add(jobId, data, delayMs);
  return jobId;
}

