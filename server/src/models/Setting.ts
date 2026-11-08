import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  provider: "brevo" | "smtp" | "ethereal";
  brevoApiKey?: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
  fromEmail: string;
  fromName: string;
  apiBaseUrl: string;
  appUrl: string;
  updatedAt: Date;
}

const SettingSchema: Schema = new Schema(
  {
    provider: { type: String, enum: ["brevo", "smtp", "ethereal"], default: "ethereal" },
    brevoApiKey: { type: String, default: "" },
    smtp: {
      host: { type: String, default: "" },
      port: { type: Number, default: 587 },
      user: { type: String, default: "" },
      pass: { type: String, default: "" },
      secure: { type: Boolean, default: false },
    },
    fromEmail: { type: String, default: "notifications@sendflow.app" },
    fromName: { type: String, default: "SendFlow Studio" },
    apiBaseUrl: { type: String, default: "http://localhost:4000" },
    appUrl: { type: String, default: "http://localhost:5173" },
  },
  { timestamps: true }
);

export const Setting = mongoose.model<ISetting>("Setting", SettingSchema);

