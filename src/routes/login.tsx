import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/login")({
  head: () => meta("Sign In — SendFlow Studio", "Sign in or create an account for SendFlow Studio email automation."),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string; redirect?: string };
  const { user, login, register, loginWithGoogle, forgotPassword, resetPassword, logout } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">(
    search.token ? "reset" : "signin"
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState(search.token || "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detect OAuth callback return and error params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const searchStr = window.location.search;

    if (hash.includes("access_token") || searchStr.includes("code=")) {
      setOauthProcessing(true);
    } else if (hash.includes("error") || searchStr.includes("error=")) {
      const params = new URLSearchParams(hash.replace(/^#/, "") || searchStr);
      const desc = params.get("error_description") || params.get("error") || "Authentication was cancelled.";
      const cleanDesc = desc.replace(/\+/g, " ");
      setErrorMsg(cleanDesc);
      toast.error("Google Sign-in Notice", { description: cleanDesc });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // If OAuth successfully completed and user is newly authenticated, take them to dashboard
  useEffect(() => {
    if (oauthProcessing && user) {
      setOauthProcessing(false);
      navigate({ to: search.redirect || "/" });
    }
  }, [oauthProcessing, user, navigate, search.redirect]);

  // Update token if present in query param
  useEffect(() => {
    if (search.token) {
      setResetToken(search.token);
      setMode("reset");
    }
  }, [search.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        if (!email || !password) {
          throw new Error("Please enter both email and password.");
        }
        await login(email, password);
        toast.success("Welcome back!", {
          description: "Signed in successfully. Taking you to your dashboard.",
        });
        navigate({ to: search.redirect || "/" });
      } else if (mode === "signup") {
        if (!name || !email || !password) {
          throw new Error("Please fill out all registration fields.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        await register(name, email, password);
        toast.success("Account created successfully!", {
          description: "Welcome to Mailora. Your account is ready.",
        });
        navigate({ to: search.redirect || "/" });
      } else if (mode === "forgot") {
        if (!email) {
          throw new Error("Please enter your registered email address.");
        }
        const message = await forgotPassword(email);
        setForgotSuccess(true);
        toast.success("Password reset link generated", {
          description: message,
        });
      } else if (mode === "reset") {
        if (!resetToken || !password) {
          throw new Error("Token and new password are required.");
        }
        if (password.length < 6) {
          throw new Error("New password must be at least 6 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const message = await resetPassword(resetToken, password);
        toast.success("Password updated!", {
          description: message,
        });
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "An unexpected error occurred.";
      setErrorMsg(msg);
      toast.error("Authentication Error", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle(email || undefined, name || undefined);
      if (!isSupabaseConfigured) {
        toast.success("Signed in with Google", {
          description: "Welcome to Mailora!",
        });
        navigate({ to: search.redirect || "/" });
      } else {
        toast.info("Connecting to Google...", {
          description: "Redirecting to Google secure authentication.",
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Google sign-in could not be completed.";
      setErrorMsg(msg);
      toast.error("Google Sign-in Error", { description: msg });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[420px] w-[420px] rounded-full bg-primary-glow/20 blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/70 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Subtle gradient banner top */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-brand" />

          {oauthProcessing ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
                <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight">Authenticating with Google</h2>
              <p className="text-sm text-muted-foreground">
                Finalizing secure OAuth authentication and syncing your profile with the database...
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Supabase &amp; PostgreSQL Connected
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Header & Logo */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {mode === "signin" && "Welcome to Mailora"}
                  {mode === "signup" && "Create your account"}
                  {mode === "forgot" && "Reset your password"}
                  {mode === "reset" && "Set new password"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "signin" && "Sign in to manage your email campaigns and automations"}
                  {mode === "signup" && "Start sending high-converting email sequences in seconds"}
                  {mode === "forgot" && "Enter your email to receive a password reset link"}
                  {mode === "reset" && "Choose a strong new password for your account"}
                </p>
              </div>

              {/* Active Account Switcher Indicator */}
              {user && (
                <div className="mb-5 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs">
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="h-2 w-2 rounded-full bg-success shrink-0 animate-pulse" />
                    <span className="truncate text-foreground">
                      Active: <strong>{user.email}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        toast.info("Signed out of current account. You can now log into a different account.");
                      }}
                      className="font-semibold text-destructive hover:underline text-xs"
                    >
                      Sign Out
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: search.redirect || "/" })}
                      className="font-semibold text-primary hover:underline text-xs"
                    >
                      Dashboard &rarr;
                    </button>
                  </div>
                </div>
              )}

          {/* Mode Switcher Tabs for Sign In vs Sign Up */}
          {(mode === "signin" || mode === "signup") && (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMsg(null);
                }}
                className={`relative rounded-xl py-2 text-xs font-semibold transition-all ${
                  mode === "signin"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                }}
                className={`relative rounded-xl py-2 text-xs font-semibold transition-all ${
                  mode === "signup"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Google OAuth Button */}
          {(mode === "signin" || mode === "signup") && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="group relative flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card/90 px-4 text-sm font-medium text-foreground transition-all hover:bg-accent/80 hover:shadow-md active:scale-[0.99] disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
                </span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  OAuth
                </span>
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-border/80" />
                <span className="absolute bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                  or email & password
                </span>
              </div>
            </div>
          )}

          {/* Error Alert Box */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </motion.div>
          )}

          {/* Forgot Password Success Message */}
          {forgotSuccess && mode === "forgot" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-success/30 bg-success/10 p-4 text-xs text-success"
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Reset instructions dispatched
              </div>
              <p className="mt-1 text-muted-foreground">
                If an account exists with <strong>{email}</strong>, we've dispatched a password reset link. Check your inbox or terminal logs.
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) */}
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Arjit Sharma"
                    className="h-11 w-full rounded-2xl border border-input bg-muted/30 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
            )}

            {/* Email Field (Sign In, Sign Up, Forgot) */}
            {mode !== "reset" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arjit@company.com"
                    className="h-11 w-full rounded-2xl border border-input bg-muted/30 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
            )}

            {/* Password Field (Sign In, Sign Up, Reset) */}
            {mode !== "forgot" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    {mode === "reset" ? "New Password" : "Password"}
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrorMsg(null);
                        setForgotSuccess(false);
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-11 w-full rounded-2xl border border-input bg-muted/30 pl-10 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password Field (Sign Up & Reset only) */}
            {(mode === "signup" || mode === "reset") && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-11 w-full rounded-2xl border border-input bg-muted/30 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand font-medium text-primary-foreground shadow-glow transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {mode === "signin" && (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                  {mode === "signup" && (
                    <>
                      <span>Create Free Account</span>
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                  {mode === "forgot" && (
                    <>
                      <span>Send Reset Link</span>
                      <KeyRound className="h-4 w-4" />
                    </>
                  )}
                  {mode === "reset" && (
                    <>
                      <span>Set New Password</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" && (
              <p>
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Create one now
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}
            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </button>
            )}
          </div>
            </>
          )}
        </div>

        {/* PostgreSQL & Supabase connection badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
          <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
          <span>PostgreSQL + Prisma & Supabase Auth Protected</span>
        </div>
      </motion.div>
    </div>
  );
}

