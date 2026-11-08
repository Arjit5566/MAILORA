import mongoose from "mongoose";
import { config } from "./env.js";

export let isMongoConnected = false;

export async function connectDB(): Promise<boolean> {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    isMongoConnected = true;
    console.log(`[Database] MongoDB connected successfully to ${config.mongoUri}`);
    return true;
  } catch (error: any) {
    isMongoConnected = false;
    console.warn(`[Database] MongoDB connection failed: ${error.message}. Running in memory fallback mode.`);
    return false;
  }
}

