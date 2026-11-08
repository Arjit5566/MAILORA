import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Megaphone, CalendarClock, Send, Users, Workflow, FileText, BarChart3,
  ChevronsLeft, Menu, Moon, Sun, Search, Bell, Zap, X, Settings as SettingsIcon,
  LogOut, LogIn, User as UserIcon, ShieldCheck, Sparkles, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { SettingsModal } from "./SettingsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-generator", label: "AI Generator", icon: Sparkles },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/scheduling", label: "Scheduling", icon: CalendarClock },
  { to: "/bulk", label: "Bulk Email", icon: Send },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/workflows", label: "Automations", icon: Workflow },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item, i) => {
        const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
        return (
          <motion.div key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <Link
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-sidebar-accent ring-1 ring-primary/30" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <item.icon className={cn("relative h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span className="relative truncate">{item.label}</span>}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1 group">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-glow group-hover:scale-105 transition-transform">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            Mailora
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono -mt-1">
            Smarter. Automatically.
          </span>
        </div>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { backendConnected } = useStore();
  const { user, logout, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(true);
  // mounted is false on SSR and during first render, becomes true after hydration
  const [mounted, setMounted] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully", {
      description: "You have been logged out of your session.",
    });
    navigate({ to: "/login" });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "SF";
  };

  const isAuthPage = path === "/login" || path === "/reset-password";
  const isPublicPage = path === "/" || path === "/about";

  // ── Auth pages: clean, minimal shell ─────────────────────────────────────
  if (isAuthPage) {
    return (
      <div className="relative min-h-screen w-full bg-background">
        <header className="flex h-16 items-center justify-between border-b bg-background/60 px-6 backdrop-blur-xl">
          <Brand collapsed={false} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-xl border hover:bg-accent"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Back to Home →
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // ── Before hydration completes: render a neutral loading shell ────────────
  // This prevents any SSR/client mismatch — the server and client first paint
  // always render this same empty shell. The real UI swaps in after mount.
  if (!mounted) {
    return (
      <div className="relative min-h-screen w-full bg-background flex flex-col">
        <div className="flex h-16 items-center border-b bg-background/60 px-6">
          <Brand collapsed={false} />
        </div>
        <main className="flex-1" />
      </div>
    );
  }

  // ── Public landing / about — not signed in ────────────────────────────────
  if (isPublicPage && !user) {
    return (
      <div className="relative min-h-screen w-full bg-background flex flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 sm:px-8 backdrop-blur-xl">
          <Brand collapsed={false} />

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#tech" className="hover:text-foreground transition-colors">
              Tech Stack
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-xl border hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs font-medium">
                Sign In
              </Button>
            </Link>

            <Link to="/login">
              <Button size="sm" className="bg-gradient-brand shadow-glow text-xs font-semibold text-primary-foreground">
                Get Started
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border/40 bg-muted/20 py-8 px-4 text-center text-xs text-muted-foreground">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Mailora</span>
              <span>— Your Emails. Smarter. Automatically.</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <span>© {new Date().getFullYear()} Mailora Studio. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ── Protected page — not signed in ────────────────────────────────────────
  if (!loading && !user && !isPublicPage) {
    return (
      <div className="relative min-h-screen w-full bg-background flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/70 px-6 backdrop-blur-xl">
          <Brand collapsed={false} />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button size="sm" className="bg-gradient-brand shadow-glow text-xs font-semibold">
                Sign In to Continue
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl text-center space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary mx-auto grid place-items-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Sign In Required</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You must sign in to Mailora to access this feature. Create an account or sign in with your credentials to unlock the full platform.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login">
                <Button className="w-full bg-gradient-brand shadow-glow text-xs font-semibold">
                  Sign In or Create Account
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                  ← Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard Layout (Sidebar + Top Bar + All Features)
  return (
    <div className="relative flex min-h-screen w-full">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary-glow/15 blur-[120px]" />
      </div>

      <motion.aside
        animate={{ width: collapsed ? 76 : 248 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 backdrop-blur-xl md:flex"
      >
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />

        {/* User Card in Sidebar */}
        <div className="mt-auto flex flex-col gap-2">
          {user ? (
            <div className={cn("flex items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/30 p-2", collapsed && "justify-center p-1.5")}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow">
                {getInitials(user.name, user.email)}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{user.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={cn("flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-brand text-xs font-medium text-primary-foreground shadow-glow", collapsed && "px-0")}
            >
              <LogIn className="h-3.5 w-3.5" />
              {!collapsed && "Sign In"}
            </Link>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-8 items-center gap-2 rounded-xl px-2.5 text-xs text-muted-foreground hover:bg-sidebar-accent"
            aria-label="Toggle sidebar"
          >
            <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-6 border-r border-sidebar-border bg-popover p-4 md:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand collapsed={false} />
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
              {user && (
                <div className="mt-auto border-t pt-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-brand text-xs font-semibold text-primary-foreground">
                      {getInitials(user.name, user.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{user.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/60 px-4 backdrop-blur-xl md:px-8">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search campaigns, contacts…" className="h-9 w-full rounded-xl border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                backendConnected
                  ? "border-success/30 bg-success/10 text-success hover:bg-success/20"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", backendConnected ? "bg-success animate-pulse" : "bg-muted-foreground")} />
              <span>{backendConnected ? "PostgreSQL & Queues Active" : "Local In-Memory"}</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border hover:bg-accent"
              aria-label="Email Provider Settings"
              title="Provider & Delivery Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>

            <button onClick={() => setDark((v) => !v)} className="grid h-9 w-9 place-items-center rounded-xl border hover:bg-accent" aria-label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="relative grid h-9 w-9 place-items-center rounded-xl border hover:bg-accent" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-glow" />
            </button>

            {/* User Profile Dropdown or Sign In Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                    title={user.name}
                  >
                    {getInitials(user.name, user.email)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl">
                  <DropdownMenuLabel className="p-2">
                    <div className="text-xs font-semibold text-foreground">{user.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-success">
                      <ShieldCheck className="h-3 w-3" />
                      <span>PostgreSQL & JWT Active</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer gap-2 rounded-xl text-xs">
                    <SettingsIcon className="h-3.5 w-3.5" /> Provider Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 rounded-xl text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-brand px-3 text-xs font-medium text-primary-foreground shadow-glow transition-all hover:opacity-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex-1 p-4 md:p-8">
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
