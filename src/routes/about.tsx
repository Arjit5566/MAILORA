import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Mail,
  Send,
  CalendarClock,
  Workflow,
  Users,
  FileText,
  BarChart3,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Server,
  Code2,
  ChevronRight,
  ExternalLink,
  Flame,
  Check,
  MousePointerClick,
  TrendingUp,
  Inbox,
  Filter,
  Play,
  Award,
  Globe2,
  Lock,
} from "lucide-react";
import { meta } from "@/lib/meta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/about")({
  head: () =>
    meta(
      "About Mailora",
      "Mailora — Your Emails. Smarter. Automatically. Discover our next-gen AI-powered email automation platform."
    ),
  component: AboutMailora,
});

// Features Data
const FEATURES = [
  {
    id: "ai-studio",
    title: "AI Mail Studio",
    tagline: "Gemini-powered copycrafting",
    description:
      "Generate persuasive, high-converting subject lines, preheaders, and responsive HTML emails in seconds. Adjust tone from executive to witty with context-aware AI.",
    icon: Sparkles,
    gradient: "from-purple-500/20 via-primary/20 to-blue-500/20",
    badge: "Gemini 2.5 Flash",
    link: "/ai-generator",
  },
  {
    id: "bulk-campaigns",
    title: "Bulk Email Campaigns",
    tagline: "High-volume precision dispatch",
    description:
      "Seamlessly import thousands of contacts from Excel (.xlsx) and CSV spreadsheets. Automatic deduplication, syntax validation, and strict explicit recipient targeting.",
    icon: Send,
    gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
    badge: "Smart Validation",
    link: "/bulk",
  },
  {
    id: "smart-scheduling",
    title: "Smart Scheduling",
    tagline: "Timezone-aware delivery queues",
    description:
      "Schedule individual emails or massive campaigns across 12 global timezones. Second-by-second countdowns, pausing, resuming, and automated background workers.",
    icon: CalendarClock,
    gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
    badge: "Background BullMQ",
    link: "/scheduling",
  },
  {
    id: "visual-automations",
    title: "Automation Workflows",
    tagline: "Triggered multi-stage logic",
    description:
      "Design flexible customer journeys with visual nodes. Fire onboarding sequences when contacts join, branch on user tags, and apply smart delays without code.",
    icon: Workflow,
    gradient: "from-indigo-500/20 via-purple-500/20 to-pink-500/20",
    badge: "Visual Node Engine",
    link: "/workflows",
  },
  {
    id: "contact-management",
    title: "Audience & Contacts",
    tagline: "Segmentation & compliance",
    description:
      "Maintain clean subscriber lists with real-time unsubscribe handling, bounce filtering, custom tags, and complete historical interaction profiles.",
    icon: Users,
    gradient: "from-pink-500/20 via-rose-500/20 to-orange-500/20",
    badge: "GDPR & CAN-SPAM",
    link: "/contacts",
  },
  {
    id: "templates-engine",
    title: "Responsive Templates",
    tagline: "Production-ready designs",
    description:
      "Curated library of beautiful, mobile-optimized email templates for newsletters, product launches, VIP offers, and onboarding drip campaigns.",
    icon: FileText,
    gradient: "from-amber-500/20 via-orange-500/20 to-red-500/20",
    badge: "One-Click Load",
    link: "/templates",
  },
  {
    id: "advanced-analytics",
    title: "Real-Time Analytics",
    tagline: "Brevo webhook telemetry",
    description:
      "Track every open pixel and link click in real-time. Full audit logs with message IDs, user-agent details, and automated delivery rate calculations.",
    icon: BarChart3,
    gradient: "from-violet-500/20 via-purple-500/20 to-primary/20",
    badge: "Live Telemetry",
    link: "/analytics",
  },
];

// Workflow Steps
const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Draft with Generative Intelligence",
    subtitle: "AI Mail Studio or Designer Templates",
    description:
      "Start by prompting Mailora with your target outcome, or pick from our library of responsive layouts. Gemini generates polished subject lines and engaging HTML copy instantly.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Import & Strict Recipient Verification",
    subtitle: "Excel, CSV or Segmented Contacts",
    description:
      "Upload recipient spreadsheets or pick tagged contact lists. Mailora cleans the list, highlights duplicates, removes invalid addresses, and requires your explicit send confirmation.",
    icon: Filter,
  },
  {
    number: "03",
    title: "Schedule or Dispatch with Smart Pacing",
    subtitle: "Atomic Background Worker Queues",
    description:
      "Choose immediate dispatch or schedule for optimal timezone engagement. Our background queue handles pacing at 80ms intervals to protect domain reputation and respect API limits.",
    icon: Clock,
  },
  {
    number: "04",
    title: "Live Open & Click Telemetry",
    subtitle: "Real-Time PostgreSQL Audit Logs",
    description:
      "Monitor engagement as it happens. Invisible tracking pixels and Brevo webhooks update open rates, click tracking, delivery confirmations, and bounce prevention in real time.",
    icon: TrendingUp,
  },
];

// Technology Stack
const TECH_STACK = [
  {
    name: "React 19 & TanStack",
    category: "Modern Frontend",
    description: "Type-safe routing, ultra-responsive UI, and zero-flicker transitions with TanStack Router & Vite.",
    icon: Code2,
    accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    name: "Node.js & Express",
    category: "High-Throughput Backend",
    description: "Concurrent REST API orchestrating rate pacing, webhook event listeners, and JWT security.",
    icon: Server,
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    name: "PostgreSQL & Prisma",
    category: "Relational Persistence",
    description: "ACID compliant transactional storage for campaign metadata, granular recipient tables, and email audit logs.",
    icon: Database,
    accent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  {
    name: "Google Gemini 2.5",
    category: "Generative AI Core",
    description: "Multimodal contextual intelligence for tone adaptation, persuasive copy, and subject line variations.",
    icon: Cpu,
    accent: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    name: "Brevo (Sendinblue)",
    category: "Deliverability Engine",
    description: "Enterprise SMTP & REST API v3 with IP whitelisting, reputation protection, and bounce handling.",
    icon: Send,
    accent: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  },
  {
    name: "BullMQ & Redis",
    category: "Distributed Background Queues",
    description: "Persistent timer triggers, automatic retry backoffs, and atomic status locks across server restarts.",
    icon: Layers,
    accent: "text-red-400 border-red-500/30 bg-red-500/10",
  },
];

// Illustrative Demo Statistics
const METRICS = [
  { value: "99.8%", label: "Target Delivery Reliability", note: "Powered by Brevo Tier-1 SMTP delivery infrastructure" },
  { value: "10x", label: "Faster Campaign Creation", note: "From raw concept to rendered HTML using Gemini AI" },
  { value: "80ms", label: "ISP Safe-Rate Pacing", note: "Guaranteed domain health and zero rate-limit throttling" },
  { value: "0", label: "Accidental Broadcasts", note: "Strict confirmation guardrails before any real dispatch" },
];

export function AboutMailora() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // If already logged in, redirect directly to dashboard so about is only for when we start
  useEffect(() => {
    if (user && window.location.pathname === "/about") {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  // Auto-cycle workflow steps for interactive illustration
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden pb-20">
      {/* Background Animated Gradient Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-primary/20 blur-[150px] animate-pulse" />
        <div className="absolute top-[40%] right-[-5%] h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[10%] h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      </div>

      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Brand Announcement Pill */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md shadow-glow"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary-glow" />
            <span>Meet Mailora — The Intelligent Email Automation Cloud</span>
            <span className="hidden sm:inline-block text-muted-foreground">•</span>
            <span className="hidden sm:inline-block text-muted-foreground font-normal">v2.5 Release</span>
          </motion.div>

          {/* Main Title & Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-3 max-w-4xl"
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight">
              Your Emails. <span className="text-gradient">Smarter.</span>
              <br />
              <span className="relative inline-block mt-1">
                Automatically.
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-brand rounded-full opacity-70 blur-[1px]" />
              </span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto pt-4 leading-relaxed font-normal">
              Mailora is the unified email automation platform that combines <strong>Generative AI copy generation</strong>, 
              <strong> bulk spreadsheet imports</strong>, and <strong>smart background scheduling</strong> into a seamless, high-deliverability dashboard.
            </p>
          </motion.div>

          {/* Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-4"
          >
            <Link to="/ai-generator">
              <Button size="lg" className="bg-gradient-brand shadow-glow text-primary-foreground font-semibold px-7 h-12 rounded-xl group">
                <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                Launch AI Studio
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link to="/campaigns">
              <Button size="lg" variant="outline" className="border-border/80 bg-background/60 backdrop-blur-md h-12 px-6 rounded-xl hover:bg-accent">
                <Mail className="h-4 w-4 mr-2 text-primary" />
                Manage Campaigns
              </Button>
            </Link>

            <Link to="/scheduling">
              <Button size="lg" variant="ghost" className="h-12 px-5 rounded-xl text-muted-foreground hover:text-foreground">
                <CalendarClock className="h-4 w-4 mr-2" />
                View Schedules
              </Button>
            </Link>
          </motion.div>

          {/* Hero Illustration / Interactive Floating Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-5xl mt-12 pt-6 relative"
          >
            {/* Ambient Backlight */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-purple-600/30 to-blue-600/30 rounded-3xl blur-2xl -z-10 opacity-70 transform -translate-y-2 scale-98" />

            {/* Glass Container */}
            <div className="relative rounded-2xl border border-white/10 bg-card/60 p-4 sm:p-6 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Window Controls */}
              <div className="flex items-center justify-between pb-4 border-b border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">mailora.studio/campaigns</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Brevo Live API v3 Connected
                  </Badge>
                </div>
              </div>

              {/* Inside Dashboard Hero Preview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-5 text-left">
                {/* Left Mini Panel */}
                <div className="md:col-span-4 space-y-3">
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Active Campaign</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">Q4 Product Showcase</div>
                    <div className="text-xs text-muted-foreground mt-1">Dispatched to 2,450 verified enterprise leads</div>
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">48.2% Open Rate</span>
                      <span className="text-purple-400 font-semibold">16.4% Clicks</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Optimization Active
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      "Subject variant B generated by Gemini scored 32% higher estimated open probability."
                    </p>
                  </div>
                </div>

                {/* Center / Right Content Preview */}
                <div className="md:col-span-8 p-4 rounded-xl bg-background/50 border border-border/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div>
                        <div className="text-xs text-muted-foreground">Subject Line</div>
                        <div className="text-sm font-semibold text-foreground">Welcome to the future of automation, {"{{name}}"}</div>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                        Strict Recipient Verification
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div className="h-2 w-3/4 rounded bg-muted/70" />
                      <div className="h-2 w-full rounded bg-muted/50" />
                      <div className="h-2 w-5/6 rounded bg-muted/50" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" />
                      Anti-Spam & Rate-Limit Shield Active
                    </span>
                    <span className="font-mono">Paced at 80ms / email</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. ABOUT MAILORA SECTION */}
      <section className="py-16 md:py-24 px-4 border-t border-border/40 bg-muted/20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" />
              About The Mailora Vision
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built for Modern Teams Who Value Precision, Speed & Deliverability.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Traditional email marketing tools are bloated, clunky, and plagued by unpredictable deliverability.
              Writing persuasive copy takes hours, scheduling across timezones is prone to mistakes, and manual spreadsheet imports often lead to duplicate or invalid sends.
            </p>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              <strong>Mailora changes everything.</strong> By pairing Google Gemini’s deep generative capabilities with Brevo’s tier-one email delivery backbone and PostgreSQL ACID durability, Mailora provides an intuitive command center for all your outreach.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero Blind Broadcasts</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Full Unsubscribe Sync</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Sub-Second Queue Dispatch</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Real-Time Webhook Metrics</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">The Mailora Advantage</span>
                <Badge variant="outline" className="text-[10px]">Architecture</Badge>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Next-Gen Copy Generation</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Eliminate writer's block with contextual tone switching, preheader optimization, and dynamic variable injection.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Anti-Spam & Rate-Limit Shield</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Automatic 80ms pacing, duplicate recipient deduplication, and syntax validation ensure your domain never hits spam blacklists.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Resilient Background Workers</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Scheduled jobs survive server restarts and network interruptions with Redis BullMQ and persistent PostgreSQL state locks.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY FEATURES GRID */}
      <section id="features" className="py-16 md:py-24 px-4 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10 px-3 py-1">
            End-To-End Suite
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Everything You Need to Run High-Converting Campaigns
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            From creative AI brainstorming to mission-critical scheduled deliveries, Mailora delivers enterprise-level tooling in an ultra-clean interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-glow hover:border-primary/50 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-foreground shrink-0 border border-white/5`}>
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {feature.badge}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <div className="text-[11px] font-medium text-muted-foreground/80 mt-0.5">
                    {feature.tagline}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/40">
                <Link
                  to={feature.link}
                  className="inline-flex items-center text-xs font-medium text-primary hover:text-primary-glow transition-colors"
                >
                  Explore Feature
                  <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS (ANIMATED WORKFLOW) */}
      <section id="workflow" className="py-16 md:py-24 px-4 bg-muted/20 border-y border-border/40 scroll-mt-20">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30 bg-purple-500/10">
              Interactive Blueprint
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              How Mailora Works Under the Hood
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              A 4-step pipeline that turns ideas into delivered, tracked emails with zero friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div
                key={step.number}
                onClick={() => setActiveStep(idx)}
                className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative ${
                  activeStep === idx
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border/60 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/20">
                    Step {step.number}
                  </span>
                  <step.icon className={`h-4 w-4 ${activeStep === idx ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="font-semibold text-sm text-foreground">{step.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{step.subtitle}</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE MAILORA */}
      <section className="py-16 md:py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            Unmatched Superiority
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Why Teams Choose Mailora Over Outdated Platforms
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Old Legacy Tools
            </div>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">✕</span>
                <span>Manual copywriting with rigid, dated visual builders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">✕</span>
                <span>Accidental blasts to unsubscribed or unverified contacts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">✕</span>
                <span>Unbuffered sending leading to ISP throttle and spam folder exile</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">✕</span>
                <span>Opaque delivery logs with no real-time webhook feedback</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 shadow-glow">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Mailora Smart Automation
            </div>
            <ul className="space-y-2.5 text-xs text-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                <span>Instant Gemini GenAI copycrafting, multiple subject variations & live HTML preview</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                <span>Strict explicit recipient enforcement with confirmation modal protection</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                <span>Smart 80ms rate-pacing + tier-one Brevo deliverability shields</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                <span>Real-time webhook synchronization for opens, clicks, and bounce filtering</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. TECHNOLOGY STACK */}
      <section id="tech" className="py-16 md:py-24 px-4 bg-muted/20 border-t border-border/40 scroll-mt-20">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
              Modern Engineering
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Built on Modern, Production-Grade Infrastructure
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              No black-box third party scripts. Every component is architected for reliability, safety, and speed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH_STACK.map((tech) => (
              <div
                key={tech.name}
                className="p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${tech.accent}`}>
                    <tech.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                    {tech.category}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{tech.name}</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {tech.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. STATISTICS SECTION */}
      <section className="py-16 md:py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
            Platform Metrics
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Performance Designed For High Volume
          </h2>
          <p className="text-xs text-muted-foreground">Illustrative demo benchmarks achieved across architecture stress tests.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {METRICS.map((m) => (
            <div key={m.label} className="p-5 rounded-2xl border border-border/60 bg-card text-center space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-gradient font-mono">
                {m.value}
              </div>
              <div className="text-xs font-semibold text-foreground">{m.label}</div>
              <div className="text-[10px] text-muted-foreground pt-1">{m.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. FINAL CALL TO ACTION */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="relative rounded-3xl border border-primary/40 bg-gradient-to-b from-primary/20 via-card to-card p-8 sm:p-12 text-center space-y-6 shadow-2xl overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-primary/30 blur-3xl pointer-events-none" />

          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs py-1 px-3">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-primary-glow" />
            Ready in 2 Minutes
          </Badge>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto">
            Start Automating Your Emails Today with Mailora
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Experience the speed of next-generation email marketing. Generate AI emails, schedule campaigns seamlessly, and watch your deliverability soar.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/ai-generator">
              <Button size="lg" className="bg-gradient-brand shadow-glow font-semibold h-12 px-8 rounded-xl">
                <Sparkles className="h-4 w-4 mr-2" />
                Get Started Free
              </Button>
            </Link>

            <Link to="/campaigns">
              <Button size="lg" variant="outline" className="h-12 px-6 rounded-xl border-border bg-background/60 backdrop-blur-md">
                <Mail className="h-4 w-4 mr-2 text-primary" />
                Launch Dashboard
              </Button>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> Brevo API v3 Ready
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> GDPR & CAN-SPAM Compliant
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

