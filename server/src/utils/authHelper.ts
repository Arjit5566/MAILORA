import { Request } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";

export async function getAuthUserId(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, config.jwtSecret) as { userId?: string };
      if (decoded?.userId) {
        if (isPrismaConnected) {
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
          if (user) return user.id;
        } else {
          return decoded.userId;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback to primary user in PostgreSQL
  if (isPrismaConnected) {
    try {
      const first = await prisma.user.findFirst();
      if (first) return first.id;
      const created = await prisma.user.create({
        data: {
          email: "user@sendflow.app",
          name: "SendFlow User",
          password: "default_user_password_hash",
        },
      });
      return created.id;
    } catch (e: any) {
      console.warn("[AuthHelper] Fallback user warning:", e.message);
    }
  }

  return "default-user-id";
}

export function formatWithUnderscoreId<T extends { id: string }>(item: T): T & { _id: string } {
  return {
    ...item,
    _id: item.id,
  };
}

export function mapWithUnderscoreId<T extends { id: string }>(items: T[]): Array<T & { _id: string }> {
  return items.map((item) => ({
    ...item,
    _id: item.id,
  }));
}

