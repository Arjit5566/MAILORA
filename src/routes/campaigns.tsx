import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pause,
  Play,
  Trash2,
  Copy,
  Pencil,
  Send,
  Mail,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  UserCheck,
  Users,
  Eye,
  Code,
  FileSpreadsheet,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Campaign, CampaignStatus } from "@/lib/api";
import { GlassCard, PageHeader, StatusPill } from "@/components/kit";
import { RichEditor } from "@/components/RichEditor";
import { meta } from "@/lib/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/campaigns")({
  head: () => meta("Campaigns", "Create, schedule, track and manage your email campaigns."),
  component: Campaigns,
});

const statuses: CampaignStatus[] = ["draft", "scheduled", "sending", "sent", "paused", "failed"];

interface RecipientItem {
  id: string;
  email: string;
  name: string;
  source: "contacts" | "file" | "manual";
  selected: boolean;
  isValid: boolean;
  isDuplicate: boolean;
}

const COMMON_TIMEZONES = [
  { label: "UTC (Coordinated Universal Time)", value: "UTC" },
  { label: "IST (India Standard Time - UTC+5:30)", value: "Asia/Kolkata" },
  { label: "EST (Eastern Standard Time - UTC-5)", value: "America/New_York" },
  { label: "CST (Central Standard Time - UTC-6)", value: "America/Chicago" },
  { label: "PST (Pacific Standard Time - UTC-8)", value: "America/Los_Angeles" },
  { label: "GMT / BST (London - UTC+0/+1)", value: "Europe/London" },
  { label: "CET (Central European Time - UTC+1)", value: "Europe/Paris" },
  { label: "JST (Japan Standard Time - UTC+9)", value: "Asia/Tokyo" },
  { label: "AEST (Australian Eastern - UTC+10)", value: "Australia/Sydney" },
  { label: "SGT (Singapore Time - UTC+8)", value: "Asia/Singapore" },
  { label: "GST (Gulf Standard Time - UTC+4)", value: "Asia/Dubai" },
];

export function Campaigns() {
  const { campaigns, templates, contacts } = useStore();
  const search = useSearch({ strict: false }) as { templateId?: string };
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "sent" | "openRate">("date");

  // Campaign Form Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<"details" | "recipients" | "content">("details");
  const [previewMode, setPreviewMode] = useState(false);
  const [previewRecipientIdx, setPreviewRecipientIdx] = useState(0);

  // Form values
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formFromName, setFormFromName] = useState("SendFlow Studio");
  const [formFromEmail, setFormFromEmail] = useState("notifications@sendflow.app");
  const [formHtml, setFormHtml] = useState("<p>Hi {{name}},</p><p>We have exciting news for you today!</p>");
  const [formAudience, setFormAudience] = useState("Selected recipients");

  // Load template from query param if provided
  useEffect(() => {
    if (search.templateId && templates.items.length > 0) {
      const t = templates.items.find(
        (item) => item._id === search.templateId
      );
      if (t) {
        setEditing(null);
        setFormName(`Campaign - ${t.name}`);
        setFormSubject(t.subject);
        setFormHtml(t.html);
        setFormAudience("Selected recipients");
        setRecipientsList([]);
        setActiveFormTab("details");
        setPreviewMode(false);
        setOpen(true);
      }
    }
  }, [search.templateId, templates.items]);

  // Recipient list for campaign
  const [recipientsList, setRecipientsList] = useState<RecipientItem[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [manualNameInput, setManualNameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schedule sub-dialog inside form
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleTimezone, setScheduleTimezone] = useState("Asia/Kolkata");

  // Send Confirmation modal
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [campaignToSend, setCampaignToSend] = useState<Campaign | null>(null);
  const [sendingNow, setSendingNow] = useState(false);

  // Test Email modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [targetCampaign, setTargetCampaign] = useState<Campaign | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Performance Stats modal
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsData, setStatsData] = useState<{
    campaign: Campaign | null;
    metrics: { sent: number; opens: number; clicks: number; openRate: string; clickRate: string };
    recentLogs: any[];
  } | null>(null);

  // Filter and sort campaign rows
  const rows = useMemo(() => {
    let list = campaigns.items.filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (c.name + c.subject).toLowerCase().includes(q.toLowerCase())
    );

    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "sent") return (b.sent || 0) - (a.sent || 0);
      if (sortBy === "openRate") {
        const rateA = a.sent ? a.opens / a.sent : 0;
        const rateB = b.sent ? b.opens / b.sent : 0;
        return rateB - rateA;
      }
      // date default
      return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
    });

    return list;
  }, [campaigns.items, q, filter, sortBy]);

  // Recipient stats helper
  const selectedRecipients = useMemo(
    () => recipientsList.filter((r) => r.selected && r.isValid),
    [recipientsList]
  );
  const invalidRecipients = useMemo(
    () => recipientsList.filter((r) => !r.isValid),
    [recipientsList]
  );
  const duplicateRecipients = useMemo(
    () => recipientsList.filter((r) => r.isDuplicate),
    [recipientsList]
  );

  // Open Create Campaign
  const openNew = () => {
    setEditing(null);
    setFormName("");
    setFormSubject("");
    setFormFromName("SendFlow Studio");
    setFormFromEmail("notifications@sendflow.app");
    setFormHtml("<p>Hi {{name}},</p><p>We have exciting news for you today!</p>");
    setFormAudience("Selected recipients");
    setRecipientsList([]);
    setActiveFormTab("details");
    setPreviewMode(false);
    setOpen(true);
  };

  // Open Edit Campaign
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setFormName(c.name);
    setFormSubject(c.subject);
    setFormFromName(c.fromName || "SendFlow Studio");
    setFormFromEmail(c.fromEmail || "notifications@sendflow.app");
    setFormHtml(c.html || "<p>Hi {{name}},</p><p>Here is your campaign message.</p>");
    setFormAudience(c.audience);

    // Parse stored recipients if any
    let loadedRecipients: RecipientItem[] = [];
    if (c.recipients) {
      try {
        const parsed = JSON.parse(c.recipients);
        if (Array.isArray(parsed)) {
          loadedRecipients = parsed.map((item, idx) => ({
            id: `rec-${idx}-${Date.now()}`,
            email: item.email,
            name: item.name || item.email.split("@")[0],
            source: "manual",
            selected: true,
            isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email),
            isDuplicate: false,
          }));
        }
      } catch {}
    }
    setRecipientsList(loadedRecipients);
    setActiveFormTab("details");
    setPreviewMode(false);
    setOpen(true);
  };

  // Excel / CSV File parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        if (!wsname) return;
        const ws = wb.Sheets[wsname];
        if (!ws) return;
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length < 2) {
          toast.error("File is empty or missing headers");
          return;
        }

        const headers = (data[0] as string[]).map((h) => String(h || "").trim().toLowerCase());
        let emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
        let nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("first"));

        if (emailIdx === -1) {
          // Fallback to checking first row values for email pattern
          emailIdx = 0;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const existingEmails = new Set(recipientsList.map((r) => r.email.toLowerCase()));
        const newItems: RecipientItem[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[emailIdx]) continue;

          const rawEmail = String(row[emailIdx]).trim();
          const rawName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : rawEmail.split("@")[0];

          if (!rawEmail) continue;

          const isValid = emailRegex.test(rawEmail);
          const isDuplicate = existingEmails.has(rawEmail.toLowerCase());

          newItems.push({
            id: `file-${Date.now()}-${i}`,
            email: rawEmail,
            name: rawName || "Recipient",
            source: "file",
            selected: isValid && !isDuplicate,
            isValid,
            isDuplicate,
          });

          if (isValid && !isDuplicate) {
            existingEmails.add(rawEmail.toLowerCase());
          }
        }

        setRecipientsList((prev) => [...prev, ...newItems]);
        toast.success(`Imported ${newItems.length} recipients from ${file.name}`);
      } catch (err: any) {
        toast.error("Failed to parse file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Add contact from saved contacts
  const handleToggleContact = (c: any) => {
    const email = c.email.toLowerCase();
    const existing = recipientsList.find((r) => r.email.toLowerCase() === email);

    if (existing) {
      setRecipientsList((prev) => prev.filter((r) => r.email.toLowerCase() !== email));
    } else {
      setRecipientsList((prev) => [
        ...prev,
        {
          id: `contact-${c._id}`,
          email: c.email,
          name: c.name || c.email.split("@")[0],
          source: "contacts",
          selected: true,
          isValid: true,
          isDuplicate: false,
        },
      ]);
    }
  };

  // Add all active contacts
  const handleAddAllContacts = () => {
    const activeContacts = contacts.items.filter((c) => c.status !== "unsubscribed" && c.status !== "bounced");
    const existingEmails = new Set(recipientsList.map((r) => r.email.toLowerCase()));
    const toAdd: RecipientItem[] = [];

    activeContacts.forEach((c) => {
      if (!existingEmails.has(c.email.toLowerCase())) {
        toAdd.push({
          id: `contact-${c._id}`,
          email: c.email,
          name: c.name || (c.email ? c.email.split("@")[0] : "Recipient") || "Recipient",
          source: "contacts",
          selected: true,
          isValid: true,
          isDuplicate: false,
        });
        existingEmails.add(c.email.toLowerCase());
      }
    });

    setRecipientsList((prev) => [...prev, ...toAdd]);
    toast.success(`Added ${toAdd.length} saved contacts`);
  };

  // Add Manual Email
  const handleAddManualEmail = () => {
    const email = manualInput.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    const isDuplicate = recipientsList.some((r) => r.email.toLowerCase() === email.toLowerCase());

    const newItem: RecipientItem = {
      id: `manual-${Date.now()}`,
      email,
      name: manualNameInput.trim() || email.split("@")[0] || "Recipient",
      source: "manual",
      selected: isValid && !isDuplicate,
      isValid,
      isDuplicate,
    };

    setRecipientsList((prev) => [newItem, ...prev]);
    setManualInput("");
    setManualNameInput("");

    if (!isValid) toast.error("Invalid email format");
    else if (isDuplicate) toast.warning("Email already in recipient list");
    else toast.success("Added recipient");
  };

  // Save Campaign as Draft
  const handleSaveDraft = async () => {
    if (!formName.trim() || !formSubject.trim()) {
      toast.error("Campaign title and subject line are required");
      return;
    }

    const payloadRecipients = selectedRecipients.map((r) => ({
      email: r.email,
      name: r.name,
    }));

    const payload: any = {
      name: formName.trim(),
      subject: formSubject.trim(),
      fromName: formFromName.trim() || "SendFlow Studio",
      fromEmail: formFromEmail.trim() || "notifications@sendflow.app",
      audience: payloadRecipients.length > 0 ? `${payloadRecipients.length} recipients` : formAudience,
      html: formHtml,
      status: "draft",
      recipients: payloadRecipients,
      date: new Date().toISOString().slice(0, 10),
    };

    try {
      if (editing) {
        await campaigns.update(editing._id, payload);
        toast.success("Campaign updated successfully");
      } else {
        await campaigns.add({ ...payload, sent: 0, opens: 0, clicks: 0 });
        toast.success("Campaign saved as draft");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaign");
    }
  };

  // Schedule Campaign
  const handleConfirmSchedule = async () => {
    if (!formName.trim() || !formSubject.trim()) {
      toast.error("Campaign title and subject line are required");
      return;
    }

    const payloadRecipients = selectedRecipients.map((r) => ({
      email: r.email,
      name: r.name,
    }));

    if (payloadRecipients.length === 0) {
      toast.error("Please select at least one recipient to schedule");
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime.getTime() < Date.now()) {
      toast.error("Schedule time must be in the future");
      return;
    }

    const payload: any = {
      name: formName.trim(),
      subject: formSubject.trim(),
      fromName: formFromName.trim() || "SendFlow Studio",
      fromEmail: formFromEmail.trim() || "notifications@sendflow.app",
      audience: `${payloadRecipients.length} recipients (Scheduled)`,
      html: formHtml,
      status: "scheduled",
      recipients: payloadRecipients,
      scheduledAt: scheduledDateTime.toISOString(),
      timezone: scheduleTimezone,
      date: scheduleDate,
    };

    try {
      if (editing) {
        await campaigns.update(editing._id, payload);
      } else {
        await campaigns.add({ ...payload, sent: 0, opens: 0, clicks: 0 });
      }
      toast.success(`Campaign scheduled for ${scheduleDate} at ${scheduleTime} (${scheduleTimezone})`);
      setScheduleModalOpen(false);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule campaign");
    }
  };

  // Pre-Send Confirmation
  const promptSendCampaign = (c: Campaign) => {
    setCampaignToSend(c);
    setConfirmSendOpen(true);
  };

  // Real Send Execution
  const handleExecuteSend = async () => {
    if (!campaignToSend) return;
    setSendingNow(true);

    try {
      // Decode stored recipients if any
      let explicitTargets: Array<{ email: string; name: string }> = [];
      if (campaignToSend.recipients) {
        try {
          explicitTargets = JSON.parse(campaignToSend.recipients);
        } catch {}
      }

      await campaigns.send(campaignToSend._id, {
        recipients: explicitTargets,
      });

      toast.success(`Campaign "${campaignToSend.name}" is now sending via Brevo!`);
      setConfirmSendOpen(false);
      setCampaignToSend(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger campaign send");
    } finally {
      setSendingNow(false);
    }
  };

  // Test Email
  const handleTestSend = async () => {
    if (!targetCampaign || !testRecipient || !testRecipient.includes("@")) {
      toast.error("Enter a valid recipient email");
      return;
    }
    setSendingTest(true);
    try {
      const res = await campaigns.testSend(targetCampaign._id, testRecipient);
      toast.success(res?.message || "Test email dispatched");
      if (res?.previewUrl) window.open(res.previewUrl, "_blank");
      setTestModalOpen(false);
      setTestRecipient("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  // View Stats & Performance Report
  const handleViewStats = async (c: Campaign) => {
    setLoadingStats(true);
    setStatsModalOpen(true);
    try {
      const data = await campaigns.getStats(c._id);
      setStatsData(data);
    } catch (err: any) {
      toast.error("Failed to load campaign performance: " + err.message);
      setStatsData({
        campaign: c,
        metrics: {
          sent: c.sent || 0,
          opens: c.opens || 0,
          clicks: c.clicks || 0,
          openRate: c.sent ? ((c.opens / c.sent) * 100).toFixed(1) + "%" : "0%",
          clickRate: c.sent ? ((c.clicks / c.sent) * 100).toFixed(1) + "%" : "0%",
        },
        recentLogs: [],
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Insert merge tag into HTML
  const insertTag = (tag: string) => {
    setFormHtml((prev) => `${prev} ${tag} `);
    toast.success(`Inserted ${tag}`);
  };

  return (
    <div>
      <PageHeader
        title="Email Campaigns"
        description={`${campaigns.items.length} campaigns · Personalization, Brevo API delivery, explicit recipient filtering and real-time open/click analytics`}
        actions={
          <Button onClick={openNew} className="bg-gradient-brand shadow-glow font-medium">
            <Plus className="h-4 w-4 mr-1.5" /> Create Campaign
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Campaigns</div>
            <div className="text-2xl font-bold text-foreground mt-1">{campaigns.items.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Emails Sent</div>
            <div className="text-2xl font-bold text-foreground mt-1 font-mono">
              {campaigns.items.reduce((acc, c) => acc + (c.sent || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-success/10 text-success">
            <Send className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Open Rate</div>
            <div className="text-2xl font-bold text-foreground mt-1 font-mono">
              {(() => {
                const totalSent = campaigns.items.reduce((acc, c) => acc + (c.sent || 0), 0);
                const totalOpens = campaigns.items.reduce((acc, c) => acc + (c.opens || 0), 0);
                return totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) + "%" : "0.0%";
              })()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Eye className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Click Rate</div>
            <div className="text-2xl font-bold text-foreground mt-1 font-mono">
              {(() => {
                const totalSent = campaigns.items.reduce((acc, c) => acc + (c.sent || 0), 0);
                const totalClicks = campaigns.items.reduce((acc, c) => acc + (c.clicks || 0), 0);
                return totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) + "%" : "0.0%";
              })()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <BarChart3 className="h-5 w-5" />
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        {/* Controls Bar: Search, Status filter, Sorting */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative min-w-48 flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search campaigns by name or subject…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1 border">
              {(["all", ...statuses] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="relative rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-all"
                >
                  {filter === s && (
                    <motion.span
                      layoutId="cfilter"
                      className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/50"
                    />
                  )}
                  <span className="relative z-10">{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest Date</SelectItem>
                <SelectItem value="name">Campaign Name</SelectItem>
                <SelectItem value="sent">Total Sent</SelectItem>
                <SelectItem value="openRate">Open Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Campaign Data Table */}
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Campaign</th>
                <th>Status</th>
                <th>Audience / Recipients</th>
                <th className="text-right">Sent</th>
                <th className="text-right">Open Rate</th>
                <th className="text-right">Click Rate</th>
                <th>Date</th>
                <th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {rows.map((c) => {
                  let recipientCount = 0;
                  if (c.recipients) {
                    try {
                      const arr = JSON.parse(c.recipients);
                      recipientCount = Array.isArray(arr) ? arr.length : 0;
                    } catch {}
                  }

                  return (
                    <motion.tr
                      key={c._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="transition-colors hover:bg-accent/40"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {c.name}
                          {c.fromName && (
                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                              From: {c.fromName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">{c.subject}</div>
                      </td>

                      <td>
                        <StatusPill status={c.status} />
                      </td>

                      <td>
                        <div className="text-xs text-foreground font-medium">
                          {c.audience || "Selected recipients"}
                        </div>
                        {recipientCount > 0 && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Users className="h-3 w-3" />
                            {recipientCount} targeted
                          </div>
                        )}
                      </td>

                      <td className="text-right font-mono font-medium">{c.sent.toLocaleString()}</td>

                      <td className="text-right font-mono">
                        <span className={c.opens > 0 ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                          {c.sent ? ((c.opens / c.sent) * 100).toFixed(1) : "0.0"}%
                        </span>
                        {c.opens > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono">({c.opens} opens)</div>
                        )}
                      </td>

                      <td className="text-right font-mono">
                        <span className={c.clicks > 0 ? "text-purple-500 font-medium" : "text-muted-foreground"}>
                          {c.sent ? ((c.clicks / c.sent) * 100).toFixed(1) : "0.0"}%
                        </span>
                        {c.clicks > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono">({c.clicks} clicks)</div>
                        )}
                      </td>

                      <td className="text-xs text-muted-foreground">{c.date}</td>

                      <td className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Now button if Draft or Paused */}
                          {(c.status === "draft" || c.status === "paused") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-primary border-primary/30 hover:bg-primary/10 hover:border-primary"
                              onClick={() => promptSendCampaign(c)}
                              title="Send immediately via Brevo API"
                            >
                              <Send className="h-3 w-3 mr-1" /> Send Now
                            </Button>
                          )}

                          {/* Stats Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewStats(c)}
                            title="View Performance Analytics"
                          >
                            <BarChart3 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          {/* More dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit Campaign
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetCampaign(c);
                                  setTestRecipient("");
                                  setTestModalOpen(true);
                                }}
                              >
                                <Mail className="h-4 w-4 mr-2" /> Send Test Email
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  campaigns.duplicate(c._id);
                                  toast.success(`Duplicated "${c.name}"`);
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" /> Duplicate Campaign
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {c.status === "paused" ? (
                                <DropdownMenuItem onClick={() => campaigns.resume(c._id)}>
                                  <Play className="h-4 w-4 mr-2 text-emerald-500" /> Resume Campaign
                                </DropdownMenuItem>
                              ) : c.status === "sending" ? (
                                <DropdownMenuItem onClick={() => campaigns.pause(c._id)}>
                                  <Pause className="h-4 w-4 mr-2 text-warning" /> Pause Sending
                                </DropdownMenuItem>
                              ) : null}

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  campaigns.remove(c._id);
                                  toast.success("Campaign deleted");
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="py-14 text-center">
              <Mail className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-base font-medium text-foreground">No campaigns found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {q || filter !== "all"
                  ? "Try clearing your filters or search keywords."
                  : "Get started by creating your first personalized bulk email campaign."}
              </p>
              {!q && filter === "all" && (
                <Button onClick={openNew} className="mt-4 bg-gradient-brand shadow-glow text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Campaign
                </Button>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {editing ? "Edit Campaign" : "Create New Campaign"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Configure campaign details, select recipients explicitly, design responsive HTML content.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {selectedRecipients.length} Recipient(s) Selected
                </Badge>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b -mb-3 mt-4 space-x-6 text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveFormTab("details")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeFormTab === "details"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                1. Campaign Details
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab("recipients")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeFormTab === "recipients"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                2. Recipients
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                  {selectedRecipients.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab("content")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeFormTab === "content"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                3. Email Content & Preview
              </button>
            </div>
          </DialogHeader>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* TAB 1: DETAILS */}
            {activeFormTab === "details" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Title *</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Black Friday Special VIP Offer"
                    />
                    <p className="text-[11px] text-muted-foreground">Internal name for identifying this campaign.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Load From Template</Label>
                    <Select
                      onValueChange={(id) => {
                        const t = templates.items.find((x) => x._id === id);
                        if (t) {
                          setFormSubject(t.subject);
                          setFormHtml(t.html);
                          toast.success(`Loaded template "${t.name}"`);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a pre-built template…" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.items.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name} ({t.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Populates subject and email HTML body.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subject Line *</Label>
                  <Input
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="e.g. Exclusive 50% discount just for you, {{name}}!"
                  />
                  <p className="text-[11px] text-muted-foreground">Supports merge tags like {"{{name}}"} and {"{{email}}"}.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From Name</Label>
                    <Input
                      value={formFromName}
                      onChange={(e) => setFormFromName(e.target.value)}
                      placeholder="e.g. SendFlow Studio"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From Email (Verified in Brevo)</Label>
                    <Input
                      value={formFromEmail}
                      onChange={(e) => setFormFromEmail(e.target.value)}
                      placeholder="e.g. notifications@sendflow.app"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RECIPIENTS */}
            {activeFormTab === "recipients" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Target Recipients</div>
                    <div className="text-[11px] text-muted-foreground">
                      Import Excel/CSV, select saved contacts, or enter emails manually. Emails are sent ONLY to checked recipients.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" /> Import Excel/CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddAllContacts}
                      className="h-8 text-xs"
                    >
                      <Users className="h-3.5 w-3.5 mr-1" /> Add All Contacts
                    </Button>
                  </div>
                </div>

                {/* Sub-tabs: Saved Contacts vs Manual Entry */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: Quick Manual Add */}
                  <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/60">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      Add Individual Recipient
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Recipient Name (optional)"
                        value={manualNameInput}
                        onChange={(e) => setManualNameInput(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="email@example.com"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddManualEmail}
                        className="w-full h-8 text-xs bg-primary/20 text-primary hover:bg-primary/30"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add To List
                      </Button>
                    </div>

                    <div className="pt-2 border-t text-[11px] text-muted-foreground">
                      <strong>Tip:</strong> Drag & drop or upload any spreadsheet with "email" and "name" columns.
                    </div>
                  </div>

                  {/* Right Column: Contact Picker & Recipient Table */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        Selected Recipients List ({selectedRecipients.length} / {recipientsList.length})
                      </span>
                      <div className="flex items-center gap-2">
                        {invalidRecipients.length > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            {invalidRecipients.length} Invalid
                          </Badge>
                        )}
                        {duplicateRecipients.length > 0 && (
                          <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
                            {duplicateRecipients.length} Duplicates
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2"
                          onClick={() => setRecipientsList([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Recipient scroll table */}
                    <div className="border rounded-xl max-h-[260px] overflow-y-auto">
                      {recipientsList.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No recipients added yet. Upload an Excel/CSV file or select from contacts.
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 sticky top-0 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2 px-3 text-left w-8">
                                <Checkbox
                                  checked={recipientsList.length > 0 && selectedRecipients.length === recipientsList.length}
                                  onCheckedChange={(checked) => {
                                    setRecipientsList((prev) =>
                                      prev.map((r) => ({ ...r, selected: !!checked && r.isValid }))
                                    );
                                  }}
                                />
                              </th>
                              <th className="py-2 px-2 text-left">Recipient</th>
                              <th className="py-2 px-2 text-left">Source</th>
                              <th className="py-2 px-2 text-left">Status</th>
                              <th className="py-2 px-2 text-right pr-3">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {recipientsList.map((item) => (
                              <tr key={item.id} className="hover:bg-muted/30">
                                <td className="py-1.5 px-3">
                                  <Checkbox
                                    checked={item.selected}
                                    disabled={!item.isValid}
                                    onCheckedChange={(checked) => {
                                      setRecipientsList((prev) =>
                                        prev.map((r) => (r.id === item.id ? { ...r, selected: !!checked } : r))
                                      );
                                    }}
                                  />
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="font-medium text-foreground">{item.name}</div>
                                  <div className="text-[10px] text-muted-foreground">{item.email}</div>
                                </td>
                                <td className="py-1.5 px-2">
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {item.source}
                                  </Badge>
                                </td>
                                <td className="py-1.5 px-2">
                                  {!item.isValid ? (
                                    <span className="text-destructive flex items-center gap-1 text-[11px]">
                                      <XCircle className="h-3 w-3" /> Invalid
                                    </span>
                                  ) : item.isDuplicate ? (
                                    <span className="text-warning flex items-center gap-1 text-[11px]">
                                      <AlertTriangle className="h-3 w-3" /> Duplicate
                                    </span>
                                  ) : (
                                    <span className="text-emerald-500 flex items-center gap-1 text-[11px]">
                                      <CheckCircle2 className="h-3 w-3" /> Valid
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right pr-3">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      setRecipientsList((prev) => prev.filter((r) => r.id !== item.id))
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONTENT & PREVIEW */}
            {activeFormTab === "content" && (
              <div className="space-y-4">
                {/* Personalization variable chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/30 rounded-xl border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Insert dynamic tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-mono"
                      onClick={() => insertTag("{{name}}")}
                    >
                      {"{{name}}"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-mono"
                      onClick={() => insertTag("{{email}}")}
                    >
                      {"{{email}}"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-mono"
                      onClick={() => insertTag("{{company}}")}
                    >
                      {"{{company}}"}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    {previewMode ? <Code className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                    {previewMode ? "Switch to Editor" : "Live Preview"}
                  </Button>
                </div>

                {/* Editor vs Preview */}
                {previewMode ? (() => {
                  // Determine who to preview — real recipient or fallback
                  const validRecs = selectedRecipients;
                  const previewRec = validRecs.length > 0
                    ? validRecs[Math.min(previewRecipientIdx, validRecs.length - 1)]
                    : null;
                  const previewName = previewRec?.name || "Jane Doe";
                  const previewEmail = previewRec?.email || "jane@example.com";

                  return (
                    <div className="space-y-3">
                      {/* Recipient selector bar */}
                      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                          Preview as recipient:
                        </div>
                        {validRecs.length > 0 ? (
                          <>
                            <Select
                              value={String(Math.min(previewRecipientIdx, validRecs.length - 1))}
                              onValueChange={(v) => setPreviewRecipientIdx(Number(v))}
                            >
                              <SelectTrigger className="h-7 text-xs w-auto min-w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {validRecs.map((r, idx) => (
                                  <SelectItem key={r.id} value={String(idx)} className="text-xs">
                                    {r.name} &lt;{r.email}&gt;
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-[11px] text-muted-foreground">
                              {previewRecipientIdx + 1} of {validRecs.length} recipient(s)
                            </span>
                            <div className="flex gap-1 ml-auto">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                disabled={previewRecipientIdx === 0}
                                onClick={() => setPreviewRecipientIdx((i) => Math.max(0, i - 1))}
                              >
                                ← Prev
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                disabled={previewRecipientIdx >= validRecs.length - 1}
                                onClick={() => setPreviewRecipientIdx((i) => Math.min(validRecs.length - 1, i + 1))}
                              >
                                Next →
                              </Button>
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            No recipients added yet — showing placeholder preview. Add recipients in the Recipients tab.
                          </span>
                        )}
                      </div>

                      {/* Two-column layout: email preview + recipients sidebar */}
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
                        {/* Email preview pane */}
                        <div className="border rounded-xl bg-background overflow-hidden">
                          {/* Email header bar */}
                          <div className="bg-muted/50 border-b px-4 py-2.5 space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-14 shrink-0">From:</span>
                              <span className="font-medium text-foreground">{formFromName || "SendFlow Studio"} &lt;{formFromEmail || "notifications@sendflow.app"}&gt;</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-14 shrink-0">To:</span>
                              <span className="font-medium text-foreground">{previewName} &lt;{previewEmail}&gt;</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-14 shrink-0">Subject:</span>
                              <span className="font-semibold text-foreground">
                                {formSubject
                                  .replace(/{{name}}/g, previewName)
                                  .replace(/{{email}}/g, previewEmail)
                                  .replace(/{{company}}/g, "Acme Corp") || "(No subject)"}
                              </span>
                            </div>
                          </div>
                          {/* Rendered HTML body */}
                          <div className="p-5 min-h-[260px]">
                            <div
                              className="prose dark:prose-invert max-w-none text-sm"
                              dangerouslySetInnerHTML={{
                                __html: formHtml
                                  .replace(/{{name}}/g, previewName)
                                  .replace(/{{email}}/g, previewEmail)
                                  .replace(/{{company}}/g, "Acme Corp"),
                              }}
                            />
                          </div>
                        </div>

                        {/* Recipients sidebar */}
                        <div className="border rounded-xl bg-muted/20 overflow-hidden flex flex-col">
                          <div className="px-3 py-2 border-b bg-muted/40 text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            Recipients ({validRecs.length})
                          </div>
                          <ScrollArea className="flex-1 max-h-[320px]">
                            {validRecs.length === 0 ? (
                              <div className="py-6 text-center text-[11px] text-muted-foreground px-3">
                                No recipients selected yet.
                                <br />Go to <strong>Recipients</strong> tab to add some.
                              </div>
                            ) : (
                              <div className="divide-y divide-border/30">
                                {validRecs.map((r, idx) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setPreviewRecipientIdx(idx)}
                                    className={`w-full text-left px-3 py-2 transition-colors hover:bg-accent/50 ${
                                      idx === Math.min(previewRecipientIdx, validRecs.length - 1)
                                        ? "bg-primary/10 border-l-2 border-primary"
                                        : ""
                                    }`}
                                  >
                                    <div className="text-xs font-medium text-foreground truncate">{r.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{r.email}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                          {validRecs.length > 0 && (
                            <div className="px-3 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
                              Click a name to preview their personalised email
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="space-y-1.5">
                    <RichEditor value={formHtml} onChange={setFormHtml} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex flex-wrap items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleSaveDraft}>
                Save as Draft
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleModalOpen(true)}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Calendar className="h-4 w-4 mr-1.5" /> Schedule…
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  if (!formName.trim() || !formSubject.trim()) {
                    toast.error("Campaign title and subject line are required");
                    return;
                  }
                  if (selectedRecipients.length === 0) {
                    toast.error("Please add and select at least one recipient");
                    return;
                  }

                  const payloadRecipients = selectedRecipients.map((r) => ({
                    email: r.email,
                    name: r.name,
                  }));

                  // Save and open confirm
                  const payload: any = {
                    name: formName.trim(),
                    subject: formSubject.trim(),
                    fromName: formFromName.trim() || "SendFlow Studio",
                    fromEmail: formFromEmail.trim() || "notifications@sendflow.app",
                    audience: `${payloadRecipients.length} recipients`,
                    html: formHtml,
                    status: "draft",
                    recipients: payloadRecipients,
                    date: new Date().toISOString().slice(0, 10),
                  };

                  let targetCampaignRecord: Campaign;
                  if (editing) {
                    await campaigns.update(editing._id, payload);
                    targetCampaignRecord = { ...editing, ...payload };
                  } else {
                    targetCampaignRecord = await campaigns.add({ ...payload, sent: 0, opens: 0, clicks: 0 });
                  }

                  setOpen(false);
                  promptSendCampaign(targetCampaignRecord);
                }}
                className="bg-gradient-brand shadow-glow font-medium"
              >
                <Send className="h-4 w-4 mr-1.5" /> Send Now
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE CAMPAIGN SUB-MODAL */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Campaign Execution
            </DialogTitle>
            <DialogDescription className="text-xs">
              Automated delivery via Brevo background worker at your selected time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time (24h)</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Timezone</Label>
              <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1">
              <div className="text-foreground font-medium">Scheduling Summary:</div>
              <div className="text-muted-foreground">
                Will dispatch to <strong>{selectedRecipients.length} selected recipient(s)</strong> at{" "}
                <strong>{scheduleDate} {scheduleTime}</strong> in {scheduleTimezone}.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSchedule} className="bg-gradient-brand shadow-glow">
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM SEND NOW MODAL */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Send className="h-5 w-5" />
              Confirm Real Campaign Send
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review before triggering real email delivery through your configured Brevo API integration.
            </DialogDescription>
          </DialogHeader>

          {campaignToSend && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-2 border">
                <div>
                  <span className="text-muted-foreground">Campaign: </span>
                  <strong className="text-foreground">{campaignToSend.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject: </span>
                  <strong className="text-foreground">{campaignToSend.subject}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Audience: </span>
                  <strong className="text-foreground">{campaignToSend.audience}</strong>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Strictly Verified Sending
                </div>
                <p>
                  Emails are sent <strong>ONLY</strong> to explicitly specified recipients. Unsubscribed and duplicate contacts are automatically filtered out.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSendOpen(false)} disabled={sendingNow}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteSend}
              disabled={sendingNow}
              className="bg-gradient-brand shadow-glow font-medium"
            >
              {sendingNow ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                  Dispatching…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Confirm & Send Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TEST EMAIL MODAL */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Send Test Email
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a test copy of <strong>"{targetCampaign?.name}"</strong> to verify rendering in your inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Your Email Address</Label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={sendingTest}
              className="bg-gradient-brand shadow-glow"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {sendingTest ? "Sending…" : "Send Test Preview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PERFORMANCE & STATS REPORT MODAL */}
      <Dialog open={statsModalOpen} onOpenChange={setStatsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Campaign Performance Report
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  {statsData?.campaign?.name} — Delivery metrics & logs from Brevo tracking
                </DialogDescription>
              </div>
              {statsData?.campaign && <StatusPill status={statsData.campaign.status} />}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingStats ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                Loading campaign metrics…
              </div>
            ) : statsData ? (
              <>
                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-muted/40 rounded-xl border">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">Emails Sent</div>
                    <div className="text-xl font-bold font-mono mt-1 text-foreground">
                      {statsData.metrics.sent.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3.5 bg-muted/40 rounded-xl border">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">Unique Opens</div>
                    <div className="text-xl font-bold font-mono mt-1 text-emerald-500">
                      {statsData.metrics.opens.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{statsData.metrics.openRate} open rate</div>
                  </div>

                  <div className="p-3.5 bg-muted/40 rounded-xl border">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">Clicks</div>
                    <div className="text-xl font-bold font-mono mt-1 text-purple-500">
                      {statsData.metrics.clicks.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{statsData.metrics.clickRate} click rate</div>
                  </div>

                  <div className="p-3.5 bg-muted/40 rounded-xl border">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">Delivery Rate</div>
                    <div className="text-xl font-bold font-mono mt-1 text-blue-500">
                      {statsData.metrics.sent > 0 ? "100%" : "0%"}
                    </div>
                  </div>
                </div>

                {/* Delivery Logs Table */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Recent Delivery Logs ({statsData.recentLogs.length})</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Real-time status updates</span>
                  </div>

                  <div className="border rounded-xl max-h-[280px] overflow-y-auto">
                    {statsData.recentLogs.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No delivery logs recorded for this campaign yet.
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 sticky top-0 text-muted-foreground border-b">
                          <tr>
                            <th className="py-2 px-3 text-left">Recipient</th>
                            <th className="py-2 px-2 text-left">Status</th>
                            <th className="py-2 px-2 text-left">Message ID</th>
                            <th className="py-2 px-2 text-right pr-3">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {statsData.recentLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-muted/30">
                              <td className="py-2 px-3">
                                <div className="font-medium text-foreground">{log.recipientName || log.recipientEmail}</div>
                                <div className="text-[10px] text-muted-foreground">{log.recipientEmail}</div>
                              </td>
                              <td className="py-2 px-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] capitalize ${
                                    log.status === "opened" || log.status === "clicked"
                                      ? "text-emerald-500 border-emerald-500/30"
                                      : log.status === "sent" || log.status === "delivered"
                                      ? "text-blue-500 border-blue-500/30"
                                      : log.status === "failed" || log.status === "bounced"
                                      ? "text-destructive border-destructive/30"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {log.status}
                                </Badge>
                              </td>
                              <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                                {log.messageId || "—"}
                              </td>
                              <td className="py-2 px-2 text-right pr-3 text-[10px] text-muted-foreground">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setStatsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
