import express, { Request, Response } from "express";
import cors from "cors";
import campaignRoutes from "./routes/campaignRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import workflowRoutes from "./routes/workflowRoutes.js";
import bulkRoutes from "./routes/bulkRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiEmailRoutes from "./routes/aiEmailRoutes.js";

export const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "SendFlow Studio API",
    version: "1.0.0",
  });
});

// Auth Routes (public)
app.use("/api/auth", authRoutes);

// API Routes (protected via JWT in each route or via middleware added per-router)
app.use("/api/campaigns", campaignRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/bulk-send", bulkRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/track", trackingRoutes);
app.use("/api/ai-email", aiEmailRoutes);

// Root greeting
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "SendFlow Studio Backend",
    docs: "/api/health",
    status: "running",
  });
});

