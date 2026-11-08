import mongoose, { Schema, Document } from "mongoose";

export interface IWorkflow extends Document {
  name: string;
  description: string;
  isActive: boolean;
  nodes: any[];
  edges: any[];
  trigger: {
    type: "contact_added" | "tag_added" | "manual";
    tag?: string;
  };
  executionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    nodes: { type: [Schema.Types.Mixed], default: [] },
    edges: { type: [Schema.Types.Mixed], default: [] },
    trigger: {
      type: {
        type: String,
        enum: ["contact_added", "tag_added", "manual"],
        default: "contact_added",
      },
      tag: { type: String },
    },
    executionsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Workflow = mongoose.model<IWorkflow>("Workflow", WorkflowSchema);

