import mongoose, { Schema, Document } from "mongoose";

export interface ITemplate extends Document {
  name: string;
  category: string;
  subject: string;
  html: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Marketing", trim: true },
    subject: { type: String, required: true, trim: true },
    html: { type: String, required: true },
  },
  { timestamps: true }
);

export const Template = mongoose.model<ITemplate>("Template", TemplateSchema);

