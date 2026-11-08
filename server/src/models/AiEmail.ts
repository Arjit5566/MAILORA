import mongoose, { Schema, Document } from "mongoose";

export interface IAiEmail extends Document {
  userId?: string;
  recipientEmail: string;
  recipientName?: string;
  cc?: string;
  bcc?: string;
  emailType: string;
  tone: string;
  description: string;
  subject: string;
  htmlContent: string;
  preheader?: string;
  status: "draft" | "sent" | "scheduled" | "failed";
  scheduledAt?: Date;
  sentAt?: Date;
  error?: string;
  messageId?: string;
  previewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiEmailSchema: Schema = new Schema(
  {
    userId: { type: String, index: true },
    recipientEmail: { type: String, required: true, index: true },
    recipientName: { type: String, default: "" },
    cc: { type: String, default: "" },
    bcc: { type: String, default: "" },
    emailType: { type: String, required: true },
    tone: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },
    htmlContent: { type: String, required: true },
    preheader: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "sent", "scheduled", "failed"],
      default: "draft",
      index: true,
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    error: { type: String },
    messageId: { type: String },
    previewUrl: { type: String },
  },
  { timestamps: true }
);

export const AiEmail = mongoose.model<IAiEmail>("AiEmail", AiEmailSchema);

