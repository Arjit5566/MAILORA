import { Contact } from "../models/Contact.js";
import { Template } from "../models/Template.js";
import { Campaign } from "../models/Campaign.js";
import { ScheduledJob } from "../models/ScheduledJob.js";
import { Workflow } from "../models/Workflow.js";
import { Setting } from "../models/Setting.js";
import { isMongoConnected } from "../config/db.js";

// Clean initial empty state - No dummy data
export const initialCampaigns: any[] = [];
export const initialContacts: any[] = [];
export const initialTemplates: any[] = [];
export const initialSchedules: any[] = [];
export const initialWorkflow = null;

// Dummy emails to clean up if previously seeded
const DUMMY_EMAILS = [
  "ava.chen@linear.com",
  "liam.patel@vercel.com",
  "sofia.rossi@stripe.com",
  "noah.kim@notion.com",
  "mia.mller@figma.com",
  "ethan.brooks@resend.com",
  "zara.ali@linear.com",
  "lucas.silva@vercel.com",
  "emma.novak@stripe.com",
  "arjun.mehta@notion.com",
  "chloe.dubois@figma.com",
  "kai.tanaka@resend.com",
];

export async function seedDatabase() {
  // Purposely do not seed dummy data - keep database clean and authentic
  try {
    if (isMongoConnected) {
      // Clean up previously seeded mock contacts
      await Contact.deleteMany({ email: { $in: DUMMY_EMAILS } });
      // Clean up previously seeded dummy campaigns
      await Campaign.deleteMany({
        name: {
          $in: [
            "Black Friday Launch",
            "Product Update v3.2",
            "Onboarding Drip #1",
            "Webinar Invite",
            "Re-engagement",
            "Monthly Digest",
          ],
        },
      });
      // Ensure basic setting exists
      const settingCount = await Setting.countDocuments();
      if (settingCount === 0) {
        await Setting.create({
          provider: "ethereal",
          fromEmail: "notifications@sendflow.app",
          fromName: "SendFlow Studio",
        });
      }
    }
    console.log("[Seeder] Database initialized in clean mode (dummy data removed)");
  } catch (err: any) {
    console.error("[Seeder] Notice during init:", err.message);
  }
}
