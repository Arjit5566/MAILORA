import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Smartphone,
  Monitor,
  Code,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RotateCcw,
  Bot,
  Zap,
  Sliders,
  History,
  FileEdit,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { meta } from "@/lib/meta";
import { GlassCard, PageHeader } from "@/components/kit";
import { RichEditor } from "@/components/RichEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  request,
  endpoints,
  type GeneratedEmail,
  type AiEmailRecord,
} from "@/lib/api";

export const Route = createFileRoute("/ai-generator")({
  head: () =>
    meta(
      "AI Email Generator & Sender",
      "Generate, customize, and deliver high-impact emails with Gemini AI."
    ),
  component: AiEmailGeneratorPage,
});

const EMAIL_TYPES = [
  { id: "Business", label: "Business", desc: "Partnership, updates, B2B" },
  { id: "Marketing", label: "Marketing", desc: "Campaigns & product news" },
  { id: "Promotional", label: "Promotional", desc: "Discounts, deals, offers" },
  { id: "Professional", label: "Professional", desc: "Corporate communications" },
  { id: "Welcome", label: "Welcome", desc: "Onboarding new users & clients" },
  { id: "Invitation", label: "Invitation", desc: "Events, webinars, meetings" },
  { id: "Follow-up", label: "Follow-up", desc: "Post-meeting or check-in" },
  { id: "Job Application", label: "Job Application", desc: "Inquiry or interview follow-up" },
] as const;

const TONES = [
  { id: "Professional", label: "Professional", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { id: "Friendly", label: "Friendly", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { id: "Persuasive", label: "Persuasive", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  { id: "Formal", label: "Formal", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
] as const;

const QUICK_PROMPTS = [
  {
    title: "Product Launch",
    type: "Marketing",
    tone: "Persuasive",
    desc: "Announce the launch of our new AI-powered email automation platform with early access perks and 40% discount for annual plans.",
  },
  {
    title: "Client Welcome",
    type: "Welcome",
    tone: "Friendly",
    desc: "Warm welcome to our client, guide them to schedule their 1-on-1 onboarding session, and link to our quickstart documentation.",
  },
  {
    title: "Demo Follow-Up",
    type: "Follow-up",
    tone: "Professional",
    desc: "Thank the prospect for attending yesterday's demo, summarize key ROI metrics discussed, and offer 3 dates for next steps.",
  },
  {
    title: "Webinar Invite",
    type: "Invitation",
    tone: "Friendly",
    desc: "Invite marketing leaders to an exclusive masterclass on AI email automation happening next Thursday at 2 PM EST.",
  },
];

function generateClientFallbackEmail(params: {
  emailType: string;
  tone: string;
  description: string;
  recipientName: string;
}): GeneratedEmail {
  const greeting = params.recipientName ? `Hi ${params.recipientName},` : "Hello,";
  const desc = params.description;
  const cleanSummary = desc.length > 50 ? desc.slice(0, 47) + "…" : desc;

  let subject = `${params.emailType}: ${cleanSummary}`;
  if (params.emailType === "Marketing" || params.emailType === "Promotional") {
    subject = `✨ Exclusive: ${cleanSummary}`;
  } else if (params.emailType === "Welcome") {
    subject = `👋 Welcome to Mailora — Let's get started`;
  } else if (params.emailType === "Follow-up") {
    subject = `Quick follow-up regarding our conversation`;
  }

  const variants = [
    `Quick note: ${cleanSummary}`,
    `${params.tone} update: ${cleanSummary}`,
    `Important information regarding ${cleanSummary}`,
  ];

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff;">
              <span style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">${params.emailType} • ${params.tone}</span>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3; color: #ffffff;">${subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; font-size: 16px; line-height: 1.6; color: #334155;">
              <p style="margin: 0 0 16px 0; font-weight: 600; color: #0f172a;">${greeting}</p>
              <p style="margin: 0 0 20px 0;">${desc}</p>
              <p style="margin: 0 0 24px 0;">We have tailored this update specifically with your needs in mind. Please feel free to review the details below or get in touch directly if you have any questions.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: #4f46e5;">
                    <a href="https://mailora-lyart.vercel.app" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">Take Action &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Best regards,</p>
              <p style="margin: 0; font-weight: 600; color: #0f172a;">The Mailora Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              Sent securely via <a href="https://mailora-lyart.vercel.app" style="color: #6366f1; text-decoration: none; font-weight: 600;">Mailora Studio</a> • All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject,
    preheader: cleanSummary,
    htmlBody,
    textBody: `${greeting}\n\n${desc}\n\nBest regards,\nThe Mailora Team`,
    suggestedSubjectVariants: variants,
  };
}

function AiEmailGeneratorPage() {
  const { contacts } = useStore();

  // Generator form state
  const [emailType, setEmailType] = useState<string>("Business");
  const [tone, setTone] = useState<string>("Professional");
  const [description, setDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [subjectVariants, setSubjectVariants] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Editor and preview tabs: "editor" | "desktop" | "mobile" | "source"
  const [activeTab, setActiveTab] = useState<"editor" | "desktop" | "mobile" | "source">("editor");

  // Send & schedule state
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [scheduleTime, setScheduleTime] = useState("09:00");

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastSendResult, setLastSendResult] = useState<{
    messageId?: string | undefined;
    previewUrl?: string | undefined;
  } | null>(null);

  // Email history
  const [mainView, setMainView] = useState<"studio" | "history">("studio");
  const [history, setHistory] = useState<AiEmailRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load history on mount or tab switch
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await request<{ success: boolean; history: AiEmailRecord[] }>(
        `${endpoints.aiEmail}/history`
      );
      if (res.success && Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Quick prompt applicator
  const applyQuickPrompt = (p: typeof QUICK_PROMPTS[0]) => {
    setEmailType(p.type);
    setTone(p.tone);
    setDescription(p.desc);
    toast.info(`Applied template: ${p.title}`);
  };

  // Select contact helper
  const handleSelectContact = (contactId: string) => {
    const contact = contacts.items.find((c) => c._id === contactId);
    if (contact) {
      setRecipientName(contact.name);
      setRecipientEmail(contact.email);
      toast.success(`Selected contact: ${contact.name}`);
    }
  };

  // 1. Generate Email via Gemini
  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please enter a short description of what you want to communicate.");
      return;
    }

    setIsGenerating(true);
    setHasGenerated(false);

    try {
      let emailResult: GeneratedEmail | null = null;

      try {
        const res = await request<{ success: boolean; email: GeneratedEmail }>(
          `${endpoints.aiEmail}/generate`,
          {
            method: "POST",
            body: JSON.stringify({
              emailType,
              tone,
              description: description.trim(),
              recipientName: recipientName.trim(),
              recipientEmail: recipientEmail.trim(),
            }),
          }
        );
        if (res.success && res.email) {
          emailResult = res.email;
        }
      } catch (backendErr: any) {
        console.warn("[AIGenerator] Backend request failed, generating client fallback:", backendErr);
        // Smart client-side fallback if backend is asleep or suspended
        emailResult = generateClientFallbackEmail({
          emailType,
          tone,
          description: description.trim(),
          recipientName: recipientName.trim(),
        });
      }

      if (emailResult) {
        setSubject(emailResult.subject);
        setPreheader(emailResult.preheader || "");
        setHtmlContent(emailResult.htmlBody);
        setSubjectVariants(emailResult.suggestedSubjectVariants || []);
        setHasGenerated(true);
        setActiveTab("editor");
        toast.success("Email generated successfully!", {
          description: "Review, edit and customize your message before sending.",
        });
      } else {
        throw new Error("Could not generate email content");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate email. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. Open confirmation modal (NEVER send without confirmation)
  const handleInitiateSend = (mode: "now" | "schedule") => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject line cannot be empty.");
      return;
    }
    if (!htmlContent.trim()) {
      toast.error("Email content is empty. Please generate or compose your email.");
      return;
    }

    if (mode === "schedule") {
      if (!scheduleDate || !scheduleTime) {
        toast.error("Please select both a date and time for scheduled delivery.");
        return;
      }
    }

    setSendMode(mode);
    setConfirmOpen(true);
  };

  // 3. Final confirmed action
  const handleConfirmSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);

    try {
      if (sendMode === "now") {
        const res = await request<{
          success: boolean;
          message: string;
          messageId?: string;
          previewUrl?: string;
          emailRecord: any;
        }>(`${endpoints.aiEmail}/send`, {
          method: "POST",
          body: JSON.stringify({
            recipientEmail: recipientEmail.trim(),
            recipientName: recipientName.trim(),
            subject: subject.trim(),
            htmlContent,
            emailType,
            tone,
            description,
            preheader,
          }),
        });

        if (res.success) {
          setLastSendResult({
            messageId: res.messageId,
            previewUrl: res.previewUrl,
          });

          toast.success("Email successfully delivered!", {
            description: `Sent to ${recipientEmail}`,
            action: res.previewUrl
              ? {
                  label: "View Inbox",
                  onClick: () => window.open(res.previewUrl, "_blank"),
                }
              : undefined,
          });

          fetchHistory();
        } else {
          throw new Error("Email sending failed");
        }
      } else {
        // Schedule
        const res = await request<{
          success: boolean;
          message: string;
          scheduledAt: string;
          emailRecord: any;
        }>(`${endpoints.aiEmail}/schedule`, {
          method: "POST",
          body: JSON.stringify({
            recipientEmail: recipientEmail.trim(),
            recipientName: recipientName.trim(),
            subject: subject.trim(),
            htmlContent,
            emailType,
            tone,
            description,
            preheader,
            date: scheduleDate,
            time: scheduleTime,
          }),
        });

        if (res.success) {
          toast.success("Email scheduled successfully!", {
            description: `Will be dispatched on ${scheduleDate} at ${scheduleTime}`,
          });
          fetchHistory();
        } else {
          throw new Error("Failed to schedule email");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process send request");
    } finally {
      setIsSending(false);
    }
  };

  // Reuse history item
  const handleReuseHistory = (item: AiEmailRecord) => {
    setEmailType(item.emailType);
    setTone(item.tone);
    setDescription(item.description);
    setRecipientName(item.recipientName || "");
    setRecipientEmail(item.recipientEmail);
    setSubject(item.subject);
    setPreheader(item.preheader || "");
    setHtmlContent(item.htmlContent);
    setHasGenerated(true);
    setMainView("studio");
    toast.success("Loaded email from history into studio!");
  };

  // Delete history item
  const handleDeleteHistory = async (id?: string) => {
    if (!id) return;
    try {
      await request(`${endpoints.aiEmail}/history/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((h) => (h.id || h._id) !== id));
      toast.success("History record removed");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with Studio vs History View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="AI Email Generator & Sender"
          description="Harness Google Gemini AI to draft tailored, high-converting emails and send them with one-click confirmation."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant={mainView === "studio" ? "default" : "outline"}
            size="sm"
            onClick={() => setMainView("studio")}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI Studio
          </Button>

          <Button
            variant={mainView === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMainView("history");
              fetchHistory();
            }}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            History ({history.length})
          </Button>
        </div>
      </div>

      {mainView === "history" ? (
        /* History View */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">AI Email History (PostgreSQL)</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-3">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-base font-medium">No AI emails generated yet</p>
                <p className="text-sm max-w-sm mx-auto">
                  Switch to the AI Studio tab, write a short prompt, and your sent & scheduled emails will appear here.
                </p>
                <Button size="sm" onClick={() => setMainView("studio")} className="mt-2">
                  Go to AI Studio
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {history.map((item) => {
                  const id = item.id || item._id;
                  const isSent = item.status === "sent";
                  const isScheduled = item.status === "scheduled";

                  return (
                    <div
                      key={id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 px-3 rounded-lg transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate text-foreground">
                            {item.subject}
                          </span>
                          <Badge
                            variant={isSent ? "default" : isScheduled ? "secondary" : "outline"}
                            className="capitalize text-xs font-medium"
                          >
                            {item.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.emailType}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {item.tone}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.recipientName ? `${item.recipientName} (${item.recipientEmail})` : item.recipientEmail}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {item.previewUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1 text-primary hover:text-primary"
                            onClick={() => window.open(item.previewUrl, "_blank")}
                            title="Open Test Inbox"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Inbox Preview
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => handleReuseHistory(item)}
                          title="Load into Studio"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reuse
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteHistory(id)}
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>
      ) : (
        /* AI Studio Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration & Prompting (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">1. Configure Email Parameters</h3>
                  <p className="text-xs text-muted-foreground">Define your email audience and intent</p>
                </div>
              </div>

              {/* Email Type Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Type
                </Label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger className="w-full bg-background/50">
                    <SelectValue placeholder="Select email type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col text-left py-0.5">
                          <span className="font-medium">{t.label}</span>
                          <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Tone Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Tone
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => {
                    const active = tone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all flex items-center justify-center gap-1.5 ${
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background/40 hover:bg-accent/40 text-muted-foreground border-border/60"
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-3 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recipient Information
                  </Label>

                  {contacts.items.length > 0 && (
                    <Select onValueChange={handleSelectContact}>
                      <SelectTrigger className="h-7 text-xs px-2 w-[140px] bg-background/40">
                        <SelectValue placeholder="Quick Pick Contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.items.slice(0, 15).map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name} ({c.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="recName" className="text-xs text-muted-foreground">
                      Recipient Name
                    </Label>
                    <Input
                      id="recName"
                      placeholder="e.g. Sarah Jenkins"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="bg-background/50 h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="recEmail" className="text-xs text-muted-foreground">
                      Recipient Email *
                    </Label>
                    <Input
                      id="recEmail"
                      type="email"
                      placeholder="e.g. sarah@company.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="bg-background/50 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label htmlFor="desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description of Message *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{description.length} chars</span>
                </div>

                <Textarea
                  id="desc"
                  rows={4}
                  placeholder="Explain what you want to communicate (e.g. Introduce our new quarterly promotions, express gratitude for their loyalty, offer a 20% discount code, and invite them to schedule a call)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background/50 text-sm resize-none"
                />

                {/* Quick Prompts Inspiration */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Zap className="h-3 w-3 text-amber-400" />
                    Quick Starters:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp.title}
                        type="button"
                        onClick={() => applyQuickPrompt(qp)}
                        className="text-[11px] px-2 py-1 rounded-md bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground border border-border/40"
                      >
                        {qp.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Email Button */}
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="w-full relative overflow-hidden group shadow-lg shadow-primary/20 h-11 text-sm font-semibold"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary-foreground" />
                    <span>Gemini AI is crafting your email...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300 group-hover:scale-110 transition-transform" />
                    <span>Generate Email with Gemini</span>
                  </div>
                )}
              </Button>
            </GlassCard>

            {/* Delivery Dispatch Card */}
            {hasGenerated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <GlassCard className="p-6 space-y-4 border-primary/20 shadow-glow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">2. Dispatch Options</h4>
                        <p className="text-xs text-muted-foreground">Send immediately or schedule</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={sendMode === "now" ? "default" : "outline"}
                      onClick={() => setSendMode("now")}
                      className="text-xs h-9 gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Send Now
                    </Button>
                    <Button
                      type="button"
                      variant={sendMode === "schedule" ? "default" : "outline"}
                      onClick={() => setSendMode("schedule")}
                      className="text-xs h-9 gap-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Schedule
                    </Button>
                  </div>

                  {sendMode === "schedule" && (
                    <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in-50">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Date</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="bg-background/50 h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Time</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="bg-background/50 h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleInitiateSend(sendMode)}
                    disabled={isSending}
                    className="w-full h-10 text-sm font-semibold gap-2 bg-gradient-brand shadow-glow"
                  >
                    {isSending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : sendMode === "now" ? (
                      <>
                        <Send className="h-4 w-4" />
                        Send Now (Opens Confirmation)
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        Schedule Email (Opens Confirmation)
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    🛡️ Safety guarantee: No email is ever sent without your explicit final confirmation.
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* Right Column: Editable Rich-Text Editor & Previews (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {!hasGenerated && !isGenerating ? (
              <GlassCard className="p-12 text-center space-y-4 min-h-[500px] flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center text-primary shadow-glow">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500/20 grid place-items-center">
                    <Bot className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-md">
                  <h3 className="font-semibold text-lg">AI Email Studio is Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your email type, set your tone, and write a short description on the left.
                    Gemini AI will produce an attractive subject line, preheader, and richly formatted HTML email ready for instant dispatch.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-sm pt-4">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Attractive Subject Lines</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Editable Rich Text</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Mobile & Desktop Preview</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Real Email Dispatch</span>
                  </div>
                </div>
              </GlassCard>
            ) : isGenerating ? (
              <GlassCard className="p-12 text-center space-y-6 min-h-[500px] flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                    Generating your email...
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Synthesizing your requirements with Gemini AI to generate a compelling subject line and polished HTML body.
                  </p>
                </div>
              </GlassCard>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <GlassCard className="p-6 space-y-4">
                  {/* Subject Line & Alternatives */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subjectInput" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        Subject Line (Editable)
                      </Label>
                      <button
                        type="button"
                        onClick={() => handleCopy(subject, "Subject")}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Subject
                      </button>
                    </div>

                    <Input
                      id="subjectInput"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="font-medium text-base bg-background/50 h-10"
                    />

                    {/* Gemini Alternative Subject Lines */}
                    {subjectVariants.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Bot className="h-3 w-3 text-primary" />
                          A/B Subject Line Suggestions (Click to apply):
                        </span>
                        <div className="flex flex-col gap-1">
                          {subjectVariants.map((varSub, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSubject(varSub);
                                toast.success("Applied alternative subject line");
                              }}
                              className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground border border-border/30 truncate"
                            >
                              💡 {varSub}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preheader Preview */}
                  {preheader && (
                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] text-muted-foreground">Preheader / Snippet</Label>
                      <Input
                        value={preheader}
                        onChange={(e) => setPreheader(e.target.value)}
                        className="text-xs bg-background/40 h-8 text-muted-foreground"
                      />
                    </div>
                  )}

                  {/* Editor vs Previews Header */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
                      <button
                        type="button"
                        onClick={() => setActiveTab("editor")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === "editor"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Rich Editor
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("desktop")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === "desktop"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        Desktop
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("mobile")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === "mobile"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        Mobile
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("source")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === "source"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Code className="h-3.5 w-3.5" />
                        HTML
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="text-xs h-8 gap-1.5"
                        title="Regenerate with Gemini"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                        Regenerate
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(htmlContent, "HTML Body")}
                        className="text-xs h-8 gap-1.5"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        Copy HTML
                      </Button>
                    </div>
                  </div>

                  {/* Tab Panes */}
                  <div className="pt-2">
                    {activeTab === "editor" && (
                      <div className="space-y-2">
                        <RichEditor value={htmlContent} onChange={setHtmlContent} />
                      </div>
                    )}

                    {activeTab === "desktop" && (
                      <div className="rounded-xl border bg-card p-6 shadow-sm overflow-auto max-h-[500px]">
                        <div className="pb-4 mb-4 border-b border-border/40 text-xs text-muted-foreground space-y-1">
                          <p><strong>To:</strong> {recipientName ? `${recipientName} <${recipientEmail || "recipient@example.com"}>` : recipientEmail || "recipient@example.com"}</p>
                          <p><strong>Subject:</strong> {subject}</p>
                        </div>
                        <div
                          className="prose dark:prose-invert max-w-none text-sm"
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                      </div>
                    )}

                    {activeTab === "mobile" && (
                      <div className="flex justify-center p-4 bg-muted/20 rounded-xl">
                        <div className="w-[340px] rounded-3xl border-4 border-muted-foreground/30 bg-card shadow-2xl overflow-hidden">
                          <div className="h-6 bg-muted/60 flex items-center justify-center">
                            <div className="h-1.5 w-16 bg-muted-foreground/40 rounded-full" />
                          </div>
                          <div className="p-4 overflow-auto max-h-[440px]">
                            <div className="pb-3 mb-3 border-b border-border/40 text-[11px] text-muted-foreground space-y-0.5">
                              <p className="font-semibold text-foreground text-xs truncate">{subject}</p>
                              <p className="truncate">To: {recipientName || recipientEmail || "Recipient"}</p>
                            </div>
                            <div
                              className="prose dark:prose-invert max-w-none text-xs leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: htmlContent }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "source" && (
                      <div className="relative">
                        <pre className="p-4 rounded-xl bg-muted/50 border text-xs overflow-auto max-h-[400px] font-mono text-muted-foreground">
                          {htmlContent}
                        </pre>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* FINAL CONFIRMATION MODAL - NEVER SEND WITHOUT CONFIRMATION */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/80">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-primary pb-1">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold">
                Confirm Email Dispatch
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Please review the recipient and subject before sending. This will deliver via your configured email provider.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-3 text-sm">
            <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Recipient:</span>
                <span className="font-semibold text-foreground">
                  {recipientName ? `${recipientName} (${recipientEmail})` : recipientEmail}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Subject:</span>
                <span className="font-semibold text-foreground truncate max-w-[220px]">
                  {subject}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Delivery Mode:</span>
                <Badge variant={sendMode === "now" ? "default" : "secondary"} className="text-[10px] h-5">
                  {sendMode === "now" ? "Immediate Dispatch" : `Scheduled: ${scheduleDate} ${scheduleTime}`}
                </Badge>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground font-medium">Email Type:</span>
                <span className="text-muted-foreground">{emailType} ({tone})</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSend}
              disabled={isSending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : sendMode === "now" ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Confirm & Send Now
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  Confirm & Schedule
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

