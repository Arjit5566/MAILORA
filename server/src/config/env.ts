import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sendflow",
  jwtSecret: process.env.JWT_SECRET || "sendflow_jwt_secret_super_secure_key_2026_dev",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sendflow",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || "4000"}`,
  brevoApiKey: process.env.BREVO_API_KEY || "",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: process.env.SMTP_SECURE === "true",
  },
  fromEmail: process.env.FROM_EMAIL || "notifications@sendflow.app",
  fromName: process.env.FROM_NAME || "SendFlow Studio",
};

