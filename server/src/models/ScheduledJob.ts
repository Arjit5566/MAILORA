import mongoose, { Schema, Document } from "mongoose";

export interface IScheduledJob extends Document {
  title: string;
  campaignId?: mongoose.Types.ObjectId;
  subject?: string;
  html?: string;
  date: string;
  time: string;
  audience: string;
  status: "scheduled" | "processing" | "sent" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledJobSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    subject: { type: String, default: "" },
    html: { type: String, default: "" },
    date: { type: String, required: true },
    time: { type: String, required: true },
    audience: { type: String, default: "All subscribers" },
    status: {
      type: String,
      enum: ["scheduled", "processing", "sent", "cancelled"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true }
);

export const ScheduledJob = mongoose.model<IScheduledJob>("ScheduledJob", ScheduledJobSchema);

