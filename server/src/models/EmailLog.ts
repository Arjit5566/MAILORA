import mongoose, { Schema, Document } from "mongoose";

export interface IEmailLog extends Document {
  recipientEmail: string;
  recipientName: string;
  cc?: string;
  bcc?: string;
  subject: string;
  campaignId?: mongoose.Types.ObjectId;
  workflowId?: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;
  status: "queued" | "sent" | "delivered" | "opened" | "clicked" | "failed";
  openedAt?: Date;
  clicks: Array<{ url: string; clickedAt: Date }>;
  error?: string;
  messageId?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema: Schema = new Schema(
  {
    recipientEmail: { type: String, required: true, index: true },
    recipientName: { type: String, default: "" },
    cc: { type: String, default: "" },
    bcc: { type: String, default: "" },
    subject: { type: String, required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", index: true },
    workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "opened", "clicked", "failed"],
      default: "queued",
      index: true,
    },
    openedAt: { type: Date },
    clicks: [
      {
        url: { type: String, required: true },
        clickedAt: { type: Date, default: Date.now },
      },
    ],
    error: { type: String },
    messageId: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export const EmailLog = mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);

