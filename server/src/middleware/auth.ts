import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Malformed token" });
      return;
    }

    // Decode JWT only — no DB round-trip needed here (user id/email/name are embedded in the token)
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email: string;
      name?: string;
    };

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userName = decoded.name;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token expired" });
    } else if (err.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({ error: "Authentication error" });
    }
  }
}
