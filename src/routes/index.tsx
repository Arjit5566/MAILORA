import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, MailOpen, MousePointerClick, Send, Users, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { GlassCard, PageHeader, StatusPill, tooltipStyle } from "@/components/kit";
import { meta, trend } from "@/lib/meta";
import { Button } from "@/components/ui/button";
import { AboutMailora } from "./about";

export const Route = createFileRoute("/")({
  head: () => meta("Mailora — AI Email Automation", "Your Emails. Smarter. Automatically. Overview of email sends, opens, clicks and audience growth."),
  component: IndexPage,
});

function IndexPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground animate-pulse">Loading Mailora…</p>
        </div>
      </div>
    );
  }

  // If not logged in, show the stunning About/Landing page first!
  if (!user) {
    return <AboutMailora />;
  }

  return <Dashboard />;
}

function Dashboard() {
  const { campaigns, contacts } = useStore();
  const { user } = useAuth();
  const sent = campaigns.items.reduce((a, c) => a + c.sent, 0);
  const opens = campaigns.items.reduce((a, c) => a + c.opens, 0);
  const clicks = campaigns.items.reduce((a, c) => a + c.clicks, 0);
  const stats = [
    { label: "Emails sent", value: sent.toLocaleString(), delta: "+12.4%", icon: Send },
    { label: "Open rate", value: `${((opens / Math.max(sent, 1)) * 100).toFixed(1)}%`, delta: "+3.1%", icon: MailOpen },
    { label: "Click rate", value: `${((clicks / Math.max(sent, 1)) * 100).toFixed(1)}%`, delta: "+1.8%", icon: MousePointerClick },
    { label: "Contacts", value: contacts.items.length.toLocaleString(), delta: "+48", icon: Users },
  ];

  const displayName = user?.name ? user.name.split(" ")[0] : "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description="Here's how your Mailora automation and campaigns are performing."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/ai-generator">
                <Sparkles className="h-4 w-4 mr-1 text-primary" /> AI Mail Studio
              </Link>
            </Button>
            <Button asChild className="bg-gradient-brand shadow-glow">
              <Link to="/campaigns">
                <Plus className="h-4 w-4 mr-1" /> New campaign
              </Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <GlassCard key={s.label} delay={i * 0.06} whileHover={{ y: -4 }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent"><s.icon className="h-4 w-4 text-primary" /></div>
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">{s.value}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-success"><ArrowUpRight className="h-3 w-3" />{s.delta} vs last month</div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2" delay={0.2}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Engagement — last 14 days</h3>
            <Link to="/analytics" className="text-xs text-primary hover:underline">Full analytics →</Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="sent" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="opens" stroke="var(--chart-2)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.28} className="relative overflow-hidden">
          <motion.div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-brand opacity-30 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Automation running</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your onboarding flow sent 1,284 emails this week with a 52% open rate.</p>
          <div className="mt-5 space-y-3">
            {[["Welcome email", 92], ["Day 3 tips", 68], ["Day 7 upgrade", 41]].map(([l, v]) => (
              <div key={l as string}>
                <div className="mb-1 flex justify-between text-xs"><span>{l}</span><span className="text-muted-foreground">{v}%</span></div>
                <div className="h-1.5 rounded-full bg-muted"><motion.div className="h-full rounded-full bg-gradient-brand" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1, delay: 0.4 }} /></div>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-5 w-full"><Link to="/workflows">Open builder</Link></Button>
        </GlassCard>
      </div>

      <GlassCard className="mt-4" delay={0.35}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Recent campaigns</h3>
          <Link to="/campaigns" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <div className="divide-y">
          {campaigns.items.slice(0, 5).map((c) => (
            <div key={c._id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1"><div className="font-medium">{c.name}</div><div className="truncate text-xs text-muted-foreground">{c.subject}</div></div>
              <StatusPill status={c.status} />
              <div className="w-24 text-right text-muted-foreground">{c.sent.toLocaleString()} sent</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
