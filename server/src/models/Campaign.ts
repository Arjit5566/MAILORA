import mongoose, { Schema, Document } from "mongoose";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused";

export interface ICampaign extends Document {
  name: string;
  subject: string;
  html?: string;
  status: CampaignStatus;
  audience: string;
  sent: number;
  opens: number;
  clicks: number;
  date: string;
  scheduledAt?: Date;
  templateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    html: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "paused"],
      default: "draft",
      index: true,
    },
    audience: { type: String, default: "All subscribers" },
    sent: { type: Number, default: 0 },
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    scheduledAt: { type: Date },
    templateId: { type: Schema.Types.ObjectId, ref: "Template" },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model<ICampaign>("Campaign", CampaignSchema);

