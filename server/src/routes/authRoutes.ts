import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/prismaClient.js";
import { config } from "../config/env.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

// Helper to seed user settings in PostgreSQL with active SMTP configuration
async function seedUserSettings(userId: string) {
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

    // Hash password with optimal speed cost factor (10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in PostgreSQL
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Create settings asynchronously (non-blocking for ultra-fast response)
    seedUserSettings(user.id).catch(() => {});

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
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

    // Find user in PostgreSQL
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Auto-register convenience: If user doesn't exist yet and password is valid,
      // create the account automatically in PostgreSQL and log in seamlessly.
      if (password.length >= 6) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userName = normalizedEmail.split("@")[0] || "User";
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: userName,
            password: hashedPassword,
          },
          select: { id: true, name: true, email: true, createdAt: true },
        });

        seedUserSettings(newUser.id).catch(() => {});

        const token = jwt.sign(
          { userId: newUser.id, email: newUser.email },
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
      return res.status(401).json({ error: "Incorrect password for this account. Please try again." });
    }

    // Ensure settings exist in background (non-blocking)
    seedUserSettings(user.id).catch(() => {});

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
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
      // Create user in PostgreSQL with optimal cost factor
      const randomSecret = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomSecret, 10);
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

    // Sign our application's JWT session
    const token = jwt.sign(
      { userId: user.id, email: user.email },
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
//  GET /api/auth/me  (protected)
// ─────────────────────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
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

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err: any) {
    console.error("[Auth] Reset-password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

