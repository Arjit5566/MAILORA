import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useStore } from "@/lib/store";
import { GlassCard, PageHeader, tooltipStyle } from "@/components/kit";
import { meta, trend } from "@/lib/meta";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { request, endpoints } from "@/lib/api";
import { Mail, CheckCircle2, MousePointerClick, ShieldCheck, Flame } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => meta("Analytics", "Deep-dive into opens, clicks, devices and campaign performance."),
  component: Analytics,
});

const defaultDevices = [
  { name: "Mobile", value: 58 },
  { name: "Desktop", value: 34 },
  { name: "Tablet", value: 8 },
];
const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function Analytics() {
  const { campaigns } = useStore();
  const [range, setRange] = useState("14");
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    request<any>(endpoints.analytics)
      .then((data) => setAnalyticsData(data))
      .catch(() => {});
  }, []);

  const timeline = analyticsData?.timeline
    ? analyticsData.timeline.slice(-Number(range))
    : trend.slice(-Number(range));

  const perf =
    analyticsData?.campaignRates?.length > 0
      ? analyticsData.campaignRates
      : campaigns.items
          .filter((c) => c.sent > 0)
          .map((c) => ({
            name: c.name.slice(0, 14),
            open: +((c.opens / c.sent) * 100).toFixed(1),
            click: +((c.clicks / c.sent) * 100).toFixed(1),
          }));

  const devices = analyticsData?.devices || defaultDevices;
  const summary = analyticsData?.summary || {
    sent: campaigns.items.reduce((a, c) => a + c.sent, 0),
    opens: campaigns.items.reduce((a, c) => a + c.opens, 0),
    clicks: campaigns.items.reduce((a, c) => a + c.clicks, 0),
    deliveryRate: 99.4,
    bounceRate: 0.6,
  };

  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Delivery Intelligence"
        description="Comprehensive real-time tracking for email deliveries, open rates, click-through rates, and device telemetries."
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Delivered</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">{summary.sent.toLocaleString()}</div>
          <div className="text-[11px] text-success mt-1">99.4% Delivery success rate</div>
        </GlassCard>

        <GlassCard className="p-4" delay={0.05}>
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Overall Open Rate</span>
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {summary.sent ? ((summary.opens / summary.sent) * 100).toFixed(1) : "0"}%
          </div>
          <div className="text-[11px] text-primary mt-1">{summary.opens.toLocaleString()} verified opens</div>
        </GlassCard>

        <GlassCard className="p-4" delay={0.1}>
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Click-Through Rate</span>
            <MousePointerClick className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {summary.sent ? ((summary.clicks / summary.sent) * 100).toFixed(1) : "0"}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{summary.clicks.toLocaleString()} total clicks</div>
        </GlassCard>

        <GlassCard className="p-4" delay={0.15}>
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Reputation & Bounce</span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">0.6%</div>
          <div className="text-[11px] text-success mt-1">Excellent sender score (99.8)</div>
        </GlassCard>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-4 font-semibold text-sm">Engagement Timeline (Opens & Clicks)</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" {...axis} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="opens"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.08}>
          <h3 className="mb-4 font-semibold text-sm">Campaign Rates Performance (%)</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={perf}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="open" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="click" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.16}>
          <h3 className="mb-4 font-semibold text-sm">Recipient Client & Devices</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={devices}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {devices.map((_: any, i: number) => (
                    <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.24}>
          <h3 className="mb-4 font-semibold text-sm">Email Send Volume</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={timeline}>
                <XAxis dataKey="day" {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="sent" radius={[6, 6, 0, 0]}>
                  {timeline.map((_: any, i: number) => (
                    <Cell key={i} fill={colors[i % 2]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Live Activity Feed */}
      {analyticsData?.recentLogs?.length > 0 && (
        <GlassCard delay={0.3}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Live Email Transmission Logs
            </h3>
            <span className="text-xs text-muted-foreground font-mono">Real-time webhook events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left uppercase text-muted-foreground border-b pb-2">
                <tr>
                  <th className="pb-2">Recipient</th>
                  <th className="pb-2">Subject</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {analyticsData.recentLogs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 font-medium">{log.recipientEmail}</td>
                    <td className="py-2.5 text-muted-foreground">{log.subject}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 capitalize font-medium ${
                          log.status === "opened" || log.status === "clicked"
                            ? "bg-success/15 text-success"
                            : log.status === "failed"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
