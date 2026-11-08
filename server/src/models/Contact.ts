import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  company: string;
  tags: string[];
  status: "subscribed" | "unsubscribed" | "bounced";
  addedAt: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    company: { type: String, default: "" },
    tags: { type: [String], default: [], index: true },
    status: { type: String, enum: ["subscribed", "unsubscribed", "bounced", "active"], default: "subscribed", index: true },
    addedAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);

