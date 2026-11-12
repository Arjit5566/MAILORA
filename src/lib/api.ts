// Backend integration layer. Point VITE_API_URL at your Node/Express + Supabase/Prisma API
// Fallback gracefully to the live Render backend in production so connections never fail with localhost refused
export const API_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://mailora-1.onrender.com/api");

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed";

export interface Campaign {
  _id: string;
  id?: string;
  name: string;
  subject: string;
  html?: string;
  status: CampaignStatus;
  audience: string;
  recipients?: string;
  fromName?: string;
  fromEmail?: string;
  timezone?: string;
  scheduledAt?: string;
  sent: number;
  opens: number;
  clicks: number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  company: string;
  tags: string[];
  status: "subscribed" | "unsubscribed" | "bounced";
  addedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Template {
  _id: string;
  id?: string;
  name: string;
  category: string;
  subject: string;
  html: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduledEmail {
  _id: string;
  id?: string;
  title: string;
  subject?: string;
  html?: string;
  date: string;
  time: string;
  timezone?: string;
  audience: string;
  recipients?: string;
  status?: "scheduled" | "processing" | "sent" | "failed" | "cancelled" | "paused";
  scheduledAt?: string;
  executedAt?: string;
  sentCount?: number;
  failedCount?: number;
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowItem {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  nodes: any[];
  edges: any[];
  trigger?: {
    type: "contact_added" | "tag_added" | "manual";
    tag?: string;
  };
  executionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailSettings {
  provider: "brevo" | "smtp" | "ethereal";
  brevoApiKey?: string;
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass?: string;
    secure: boolean;
  };
  fromEmail: string;
  fromName: string;
  apiBaseUrl: string;
  appUrl: string;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL || "https://mailora-1.onrender.com/api"}${path}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("sendflow_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string>),
  };

  const res = await fetch(url, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// REST endpoints expected from the Express backend
export const endpoints = {
  health: "/health",
  campaigns: "/campaigns",
  contacts: "/contacts",
  templates: "/templates",
  schedules: "/schedules",
  workflows: "/workflows",
  bulk: "/bulk-send",
  analytics: "/analytics",
  settings: "/settings",
  aiEmail: "/ai-email",
};

export interface GeneratedEmail {
  subject: string;
  preheader: string;
  htmlBody: string;
  suggestedSubjectVariants: string[];
}

export interface AiEmailRecord {
  id?: string;
  _id?: string;
  userId?: string;
  recipientEmail: string;
  recipientName?: string;
  emailType: string;
  tone: string;
  description: string;
  subject: string;
  htmlContent: string;
  preheader?: string;
  status: "draft" | "sent" | "scheduled" | "failed";
  scheduledAt?: string;
  sentAt?: string;
  error?: string;
  messageId?: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
