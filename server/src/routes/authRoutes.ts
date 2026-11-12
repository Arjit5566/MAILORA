import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/prismaClient.js";
import { config } from "../config/env.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

// In-memory user authentication cache to guarantee instant (<20ms) login response
// and eliminate cold database roundtrip latency.
interface CachedUserAuth {
  id: string;
  name: string;
  email: string;
  password: string;
  cachedAt: number;
}

const userAuthCache = new Map<string, CachedUserAuth>();
const USER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL

export function invalidateUserCache(email?: string) {
  if (email) {
    userAuthCache.delete(email.toLowerCase().trim());
  } else {
    userAuthCache.clear();
  }
}

// Track users whose default settings have already been seeded in this process
const seededUsers = new Set<string>();

// Helper to seed user settings in PostgreSQL with active SMTP configuration
async function seedUserSettings(userId: string) {
  if (seededUsers.has(userId)) return;
  try {
    const existing = await prisma.setting.findUnique({ where: { userId } });
    if (!existing) {
      await prisma.setting.create({
        data: {
          userId,
          provider: (process.env.EMAIL_PROVIDER as string) || "smtp",
          brevoApiKey: process.env.BREVO_API_KEY || "",
          smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
          smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
          smtpUser: process.env.SMTP_USER || "arjitripathi0607@gmail.com",
          smtpPass: (process.env.SMTP_PASS || "negq rwok cgjn mcjw").replace(/\s+/g, ""),
          smtpSecure: process.env.SMTP_SECURE === "true",
          fromEmail: process.env.FROM_EMAIL || "arjitripathi0607@gmail.com",
          fromName: process.env.FROM_NAME || "Arjit Tripathi",
          appUrl: process.env.APP_URL || "http://localhost:8080",
          apiBaseUrl: process.env.API_BASE_URL || "http://localhost:4000",
        },
      });
    }
    seededUsers.add(userId);
  } catch (err: any) {
    console.warn("[Auth] Setting seed warning:", err.message);
  }
}

// ─────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash password with optimal speed cost factor (8 = fast + secure for local auth)
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create user in PostgreSQL
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Populate memory cache for instant future logins
    userAuthCache.set(normalizedEmail, {
      id: user.id,
      name: user.name,
      email: user.email,
      password: hashedPassword,
      cachedAt: Date.now(),
    });

    // Create settings asynchronously (non-blocking for ultra-fast response)
    seedUserSettings(user.id).catch(() => {});

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    console.log(`[Auth] Registered ${normalizedEmail} in ${Date.now() - startTime}ms`);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    console.error("[Auth] Register error:", err.message);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check in-memory cache first for instant (<15ms) verification
    let cachedUser = userAuthCache.get(normalizedEmail);
    if (cachedUser && Date.now() - cachedUser.cachedAt < USER_CACHE_TTL) {
      const isMatch = await bcrypt.compare(password, cachedUser.password);
      if (isMatch) {
        seedUserSettings(cachedUser.id).catch(() => {});
        const token = jwt.sign(
          { userId: cachedUser.id, email: cachedUser.email, name: cachedUser.name },
          config.jwtSecret,
          { expiresIn: config.jwtExpiresIn as any }
        );
        console.log(`[Auth] Instant cache login for ${normalizedEmail} in ${Date.now() - startTime}ms`);
        return res.json({
          message: "Login successful",
          token,
          user: { id: cachedUser.id, name: cachedUser.name, email: cachedUser.email },
        });
      }
    }

    // 2. Query PostgreSQL if not in cache or if password didn't match cached hash
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Auto-register convenience: If user doesn't exist yet and password is valid,
      // create the account automatically in PostgreSQL and log in seamlessly.
      if (password.length >= 6) {
        const hashedPassword = await bcrypt.hash(password, 8);
        const userName = normalizedEmail.split("@")[0] || "User";
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: userName,
            password: hashedPassword,
          },
          select: { id: true, name: true, email: true, createdAt: true },
        });

        // Store in cache for future instant logins
        userAuthCache.set(normalizedEmail, {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password: hashedPassword,
          cachedAt: Date.now(),
        });

        seedUserSettings(newUser.id).catch(() => {});

        const token = jwt.sign(
          { userId: newUser.id, email: newUser.email, name: newUser.name },
          config.jwtSecret,
          { expiresIn: config.jwtExpiresIn as any }
        );

        console.log(`[Auth] Auto-registered & logged in ${normalizedEmail} in ${Date.now() - startTime}ms`);

        return res.status(201).json({
          message: "Account created and logged in successfully",
          token,
          user: { id: newUser.id, name: newUser.name, email: newUser.email },
        });
      }

      return res.status(401).json({ error: "Account not found. Please enter a password with at least 6 characters to create an account." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Invalidate any stale cache entry
      userAuthCache.delete(normalizedEmail);
      return res.status(401).json({ error: "Incorrect password for this account. Please try again." });
    }

    // Cache user credentials for future instant logins
    userAuthCache.set(normalizedEmail, {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      cachedAt: Date.now(),
    });

    // Ensure settings exist in background (non-blocking)
    seedUserSettings(user.id).catch(() => {});

    // Sign JWT (include name so /me endpoint needs no DB round-trip)
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    console.log(`[Auth] Logged in ${normalizedEmail} in ${Date.now() - startTime}ms`);

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    console.error("[Auth] Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/google (Supabase OAuth Bridge)
// ─────────────────────────────────────────────
router.post("/google", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { email, name } = req.body as {
      email?: string;
      name?: string;
    };

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Create user in PostgreSQL with fast cost factor
      const randomSecret = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomSecret, 8);
      const displayName = name?.trim() || normalizedEmail.split("@")[0] || "Google User";

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          password: hashedPassword,
        },
      });

      seedUserSettings(user.id).catch(() => {});
    } else {
      // Update name if currently empty or generic
      if (name && name.trim() && (user.name === "Google User" || !user.name)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: name.trim() },
        });
      }
      seedUserSettings(user.id).catch(() => {});
    }

    // Sign our application's JWT session (include name so /me needs no DB round-trip)
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    console.log(`[Auth] Google synced ${normalizedEmail} in ${Date.now() - startTime}ms`);

    res.json({
      message: "Google login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    console.error("[Auth] Google OAuth bridge error:", err.message);
    res.status(500).json({ error: "Server error during Google login" });
  }
});

// ─────────────────────────────────────────────
//  GET /api/auth/me  (protected) — fast JWT-only path
// ─────────────────────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // userId and email are already decoded from the JWT in middleware — no DB hit needed
    // Only do a DB lookup if we need fresh name/metadata
    if (req.userId) {
      res.json({
        user: {
          id: req.userId,
          email: req.userEmail,
          name: req.userName || (req.userEmail ? req.userEmail.split("@")[0] : "User"),
        },
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/logout  (client just drops the token)
// ─────────────────────────────────────────────
router.post("/logout", (req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

// ─────────────────────────────────────────────
//  POST /api/auth/forgot-password
// ─────────────────────────────────────────────
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with success even if user doesn't exist (security)
    if (!user) {
      return res.json({ message: "If that email exists, a reset link was sent" });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

    // Send reset email (best-effort)
    try {
      await sendEmail({
        to: user.email,
        recipientName: user.name,
        subject: "Reset your SendFlow Studio password",
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>Someone requested a password reset for your SendFlow Studio account.</p>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>Or copy this URL: <code>${resetUrl}</code></p>
        `,
      });
    } catch (emailErr: any) {
      console.warn("[Auth] Could not send reset email:", emailErr.message);
    }

    res.json({ message: "If that email exists, a reset link was sent" });
  } catch (err: any) {
    console.error("[Auth] Forgot-password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/reset-password
// ─────────────────────────────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Find user with this token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Invalidate cache for this user so subsequent login uses new password
    invalidateUserCache(user.email);

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err: any) {
    console.error("[Auth] Reset-password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

