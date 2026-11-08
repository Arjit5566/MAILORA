import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  CheckCircle2,
  Mail,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Trash2,
  Search,
  Users,
  AlertCircle,
  Copy,
  Clock,
  Save,
  Check,
  X,
  RefreshCw,
  Eye,
  FileText,
  Calendar,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { GlassCard, PageHeader } from "@/components/kit";
import { RichEditor } from "@/components/RichEditor";
import { meta } from "@/lib/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { request, endpoints } from "@/lib/api";

export const Route = createFileRoute("/bulk")({
  head: () => meta("Bulk Email Campaigns", "Create, import recipients, and dispatch high-volume campaigns using Brevo."),
  component: BulkCampaignsPage,
});

export interface ImportedRecipient {
  id: string;
  email: string;
  name: string;
  company?: string | undefined;
  customFields?: Record<string, string>;
  isValid: boolean;
  isDuplicate: boolean;
  selected: boolean;
  source: "file" | "manual" | "contact";
}

export interface BulkCampaignRecord {
  id: string;
  _id: string;
  name: string;
  subject: string;
  html: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  audience: string;
  sent: number;
  opens: number;
  clicks: number;
  date: string;
  scheduledAt?: string | null;
  createdAt?: string;
  totalRecipients?: number;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function BulkCampaignsPage() {
  const { contacts, templates } = useStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Campaign Form State
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(
    "<h2>Hi {{name}},</h2><p>We are delighted to share an exclusive update with {{company}}!</p><p>Please find our latest details and updates below. If you have any questions or feedback, please feel free to reply directly to this email.</p><p>Warm regards,<br/><strong>Arjit Tripathi</strong></p>"
  );
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Recipient List State
  const [recipients, setRecipients] = useState<ImportedRecipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [manualEmailInput, setManualEmailInput] = useState("");
  const [manualNameInput, setManualNameInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send / Schedule / Confirmation States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [scheduleTime, setScheduleTime] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Progress Modal State
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaignProgress, setCampaignProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
    status: string;
    lastError?: string | null;
  }>({
    sent: 0,
    failed: 0,
    total: 0,
    status: "sending",
    lastError: null,
  });
  const [pollingActive, setPollingActive] = useState(false);

  // Quick Test Send State
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Campaign History State
  const [historyCampaigns, setHistoryCampaigns] = useState<BulkCampaignRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  // Fetch campaign history
  const fetchCampaigns = async () => {
    setLoadingHistory(true);
    try {
      const res = await request<{ success: boolean; campaigns: BulkCampaignRecord[] }>(
        `${endpoints.bulk}/campaigns`
      );
      if (res.success && Array.isArray(res.campaigns)) {
        setHistoryCampaigns(res.campaigns);
      }
    } catch {
      // In local mode or fresh db
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Poll active campaign progress
  useEffect(() => {
    let timer: any = null;
    if (pollingActive && activeCampaignId) {
      timer = setInterval(async () => {
        try {
          const res = await request<any>(`${endpoints.bulk}/campaigns/${activeCampaignId}/status`);
          if (res.success) {
            setCampaignProgress({
              sent: res.sent || 0,
              failed: res.failed || 0,
              total: res.total || 0,
              status: res.status || "sending",
              lastError: res.lastError,
            });
            if (res.status === "sent" || res.status === "failed" || (res.total > 0 && res.sent + res.failed >= res.total)) {
              setPollingActive(false);
              if (res.failed > 0 && res.sent === 0) {
                toast.error("Campaign dispatch failed", {
                  description: res.lastError || "All recipients failed delivery. Check provider settings.",
                });
              } else if (res.failed > 0) {
                toast.warning(`Partially sent: ${res.sent} delivered, ${res.failed} failed`);
              } else {
                toast.success("Campaign dispatch completed successfully!");
              }
              fetchCampaigns();
            }
          }
        } catch {
          // ignore polling glitch
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pollingActive, activeCampaignId]);

  // Recipient statistics
  const selectedRecipients = useMemo(() => recipients.filter((r) => r.selected && r.isValid), [recipients]);
  const validCount = useMemo(() => recipients.filter((r) => r.isValid).length, [recipients]);
  const duplicateCount = useMemo(() => recipients.filter((r) => r.isDuplicate).length, [recipients]);
  const invalidCount = useMemo(() => recipients.filter((r) => !r.isValid).length, [recipients]);

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return recipients;
    return recipients.filter(
      (r) => r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || (r.company && r.company.toLowerCase().includes(q))
    );
  }, [recipients, recipientSearch]);

  // Universal File Upload Parser (supports .csv, .txt, .xlsx, .xls)
  const processUploadedFile = (file: File) => {
    const isCsvOrText = /\.(csv|txt|tsv)$/i.test(file.name);

    const parseRawText = (rawText: string) => {
      try {
        const cleanText = rawText.replace(/^\uFEFF/, "").trim();
        if (!cleanText) {
          toast.error("The uploaded file is empty.");
          return;
        }

        const lines = cleanText.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
        const firstLine = lines[0];
        if (!firstLine) {
          toast.error("No data rows found in this file.");
          return;
        }

        // Auto-detect delimiter (comma, semicolon, tab, pipe)
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const pipeCount = (firstLine.match(/\|/g) || []).length;

        let delimiter = ",";
        if (semiCount > commaCount && semiCount > tabCount) delimiter = ";";
        else if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";
        else if (pipeCount > commaCount && pipeCount > semiCount) delimiter = "|";

        // Parse line respecting quotes
        const splitRow = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              result.push(current.trim().replace(/^["']|["']$/g, ""));
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^["']|["']$/g, ""));
          return result;
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const firstRowCells = splitRow(firstLine);
        const firstLineHasEmail = firstRowCells.some((c) => emailRegex.test(c.trim()));

        let headers: string[] = [];
        let dataLines: string[] = [];

        if (firstLineHasEmail) {
          // No header row
          dataLines = lines;
          headers = firstRowCells.map((_, i) => (i === 0 ? "email" : `column_${i + 1}`));
        } else {
          // First line is header
          headers = firstRowCells.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_"));
          dataLines = lines.slice(1);
        }

        let emailIdx = headers.findIndex((h) => /email|e_mail|mail|recipient|to/i.test(h));
        let nameIdx = headers.findIndex((h) => /name|full_name|first_name|recipient_name|contact/i.test(h));
        let companyIdx = headers.findIndex((h) => /company|organization|org|business|client/i.test(h));

        const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));
        const fileEmailsSeen = new Set<string>();
        const parsed: ImportedRecipient[] = [];

        for (const line of dataLines) {
          const cells = splitRow(line);
          if (cells.length === 0 || cells.every((c) => !c)) continue;

          let email = emailIdx >= 0 && cells[emailIdx] ? cells[emailIdx]!.trim() : "";
          let name = nameIdx >= 0 && cells[nameIdx] ? cells[nameIdx]!.trim() : "";
          let company = companyIdx >= 0 && cells[companyIdx] ? cells[companyIdx]!.trim() : "";

          // Fallback if email column index wasn't identified
          if (!email || !emailRegex.test(email)) {
            for (let i = 0; i < cells.length; i++) {
              const cell = cells[i];
              if (cell) {
                const candidate = cell.trim();
                if (emailRegex.test(candidate)) {
                  email = candidate;
                  if (emailIdx < 0) emailIdx = i;
                  break;
                }
              }
            }
          }

          if (!email) continue;

          if (!name) {
            for (let i = 0; i < cells.length; i++) {
              const cell = cells[i];
              if (cell && i !== emailIdx) {
                const candidate = cell.trim();
                if (candidate.length > 1 && !emailRegex.test(candidate)) {
                  name = candidate;
                  break;
                }
              }
            }
          }

          const cleanEmail = email.toLowerCase();
          const isValid = emailRegex.test(cleanEmail);
          const isDup = existingEmails.has(cleanEmail) || fileEmailsSeen.has(cleanEmail);
          fileEmailsSeen.add(cleanEmail);

          const customFields: Record<string, string> = {};
          headers.forEach((h, i) => {
            const cell = cells[i];
            if (cell && i !== emailIdx) {
              customFields[h] = cell.trim();
            }
          });

          parsed.push({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            email: cleanEmail,
            name: name || cleanEmail.split("@")[0] || "Subscriber",
            company: company || undefined,
            customFields,
            isValid,
            isDuplicate: isDup,
            selected: isValid && !isDup,
            source: "file",
          });
        }

        if (parsed.length === 0) {
          toast.error("No valid email addresses were found in this file.");
          return;
        }

        setRecipients((prev) => [...prev, ...parsed]);
        const validCount = parsed.filter((r) => r.isValid && !r.isDuplicate).length;
        toast.success(`Imported ${parsed.length} recipients (${validCount} valid) from ${file.name}`);
      } catch (err: any) {
        toast.error(`File parsing error: ${err.message || "Invalid file format"}`);
      }
    };

    if (isCsvOrText) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = String(e.target?.result || "");
        parseRawText(text);
      };
      reader.readAsText(file);
    } else {
      // Excel .xlsx, .xls
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            toast.error("The uploaded file does not contain any readable sheets.");
            return;
          }
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            toast.error("Could not read sheet content.");
            return;
          }
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          parseRawText(csvText);
        } catch (err: any) {
          toast.error(`Excel parsing error: ${err.message || "Invalid file format"}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Add Manual Email
  const handleAddManualRecipient = () => {
    const raw = manualEmailInput.trim().toLowerCase();
    if (!raw) return;

    if (!validateEmail(raw)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const isDup = recipients.some((r) => r.email.toLowerCase() === raw);
    const newEntry: ImportedRecipient = {
      id: `manual-${Date.now()}`,
      email: raw,
      name: manualNameInput.trim() || raw.split("@")[0] || "Recipient",
      isValid: true,
      isDuplicate: isDup,
      selected: !isDup,
      source: "manual",
    };

    setRecipients((prev) => [newEntry, ...prev]);
    setManualEmailInput("");
    setManualNameInput("");
    toast.success(`Added ${raw}`);
  };

  // Import from saved contacts
  const handleImportSavedContacts = () => {
    const activeContacts = contacts.items.filter((c) => c.status !== "unsubscribed" && c.status !== "bounced");
    const existing = new Set(recipients.map((r) => r.email.toLowerCase()));
    const newEntries: ImportedRecipient[] = [];

    activeContacts.forEach((c) => {
      const email = c.email.toLowerCase().trim();
      const isDup = existing.has(email);
      newEntries.push({
        id: `contact-${c._id}`,
        email,
        name: c.name || email.split("@")[0] || "Contact",
        company: c.company,
        isValid: validateEmail(email),
        isDuplicate: isDup,
        selected: !isDup,
        source: "contact",
      });
    });

    if (newEntries.length === 0) {
      toast.info("No subscribed saved contacts available to import.");
      return;
    }

    setRecipients((prev) => [...prev, ...newEntries]);
    toast.success(`Imported ${newEntries.length} saved contacts`);
  };

  // Toggle selection
  const toggleSelectRecipient = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setRecipients((prev) =>
      prev.map((r) => (r.isValid ? { ...r, selected: select } : r))
    );
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearInvalid = () => {
    setRecipients((prev) => prev.filter((r) => r.isValid && !r.isDuplicate));
    toast.info("Removed invalid and duplicate records");
  };

  const handleClearAllRecipients = () => {
    setRecipients([]);
    toast.info("Recipient list cleared");
  };

  // Insert merge tag into HTML
  const insertTag = (tag: string) => {
    setHtml((prev) => `${prev} ${tag}`);
    toast.info(`Inserted tag: ${tag}`);
  };

  // Dispatch campaign (Send Now, Schedule, Draft)
  const executeCampaign = async (action: "send" | "schedule" | "draft") => {
    if (!subject.trim()) {
      toast.error("Please enter a subject line for your campaign");
      return;
    }
    if (!html.trim()) {
      toast.error("Please enter email body content");
      return;
    }

    if (action !== "draft" && selectedRecipients.length === 0) {
      toast.error("Please select at least one valid recipient");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        campaignName: campaignName.trim() || `Campaign: ${subject.trim()}`,
        subject: subject.trim(),
        html,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        action,
        scheduledAt:
          action === "schedule" ? `${scheduleDate}T${scheduleTime}:00` : undefined,
        recipients: selectedRecipients.map((r) => ({
          email: r.email,
          name: r.name,
          company: r.company,
          customFields: r.customFields,
        })),
      };

      const res = await request<any>(endpoints.bulk, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (action === "send") {
        setActiveCampaignId(res.campaignId);
        setCampaignProgress({
          sent: 0,
          failed: 0,
          total: selectedRecipients.length,
          status: "sending",
        });
        setProgressModalOpen(true);
        setPollingActive(true);
        toast.info(`Transmitting campaign to ${selectedRecipients.length} recipients...`);
      } else if (action === "schedule") {
        toast.success(`Campaign scheduled for ${scheduleDate} at ${scheduleTime}`);
        setScheduleModalOpen(false);
      } else if (action === "draft") {
        toast.success("Campaign saved as draft");
      }

      fetchCampaigns();
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to process campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick single test send
  const sendTestPreview = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Enter a valid test email address");
      return;
    }
    setSendingTest(true);
    try {
      const res = await request<{ message: string; previewUrl?: string }>(
        `${endpoints.settings}/test-email`,
        {
          method: "POST",
          body: JSON.stringify({ to: testEmail }),
        }
      );
      toast.success(res.message || "Preview email sent");
      if (res.previewUrl) window.open(res.previewUrl, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to send preview");
    } finally {
      setSendingTest(false);
    }
  };

  // Duplicate campaign
  const handleDuplicateCampaign = async (id: string) => {
    try {
      const res = await request<any>(`${endpoints.bulk}/campaigns/${id}/duplicate`, {
        method: "POST",
      });
      toast.success(res.message || "Campaign duplicated as draft");
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate");
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string) => {
    try {
      await request<any>(`${endpoints.bulk}/campaigns/${id}`, {
        method: "DELETE",
      });
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // View campaign details & logs
  const handleViewCampaign = async (c: BulkCampaignRecord) => {
    try {
      const res = await request<any>(`${endpoints.bulk}/campaigns/${c._id || c.id}`);
      if (res.success && res.campaign) {
        setViewingCampaign(res.campaign);
        setViewDetailsOpen(true);
      }
    } catch {
      setViewingCampaign(c);
      setViewDetailsOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Email Campaigns"
        description="Compose, upload recipients via Excel/CSV, personalize with merge tags, and send at scale via Brevo."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "compose" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("compose")}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              New Campaign
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("history")}
              className="gap-1.5"
            >
              <Clock className="h-4 w-4" />
              Campaign History ({historyCampaigns.length})
            </Button>
          </div>
        }
      />

      {/* TAB 1: COMPOSE & IMPORT */}
      {activeTab === "compose" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT: Campaign Composer */}
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">1. Campaign Details</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCcBcc ? "Hide CC/BCC" : "+ Add CC/BCC"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Campaign Name (Internal)</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Black Friday Launch"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start from Template</Label>
                <Select
                  onValueChange={(id) => {
                    const t = templates.items.find((x) => x._id === id);
                    if (t) {
                      setSubject(t.subject);
                      setHtml(t.html);
                      toast.info(`Loaded template: ${t.name}`);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.items.map((t) => (
                      <SelectItem key={t._id} value={t._id} className="text-xs">
                        {t.name} ({t.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Subject Line</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Exclusive Product Update for {{name}}"
                className="h-9 text-xs font-medium"
              />
            </div>

            {showCcBcc && (
              <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in-50">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CC</Label>
                  <Input
                    placeholder="manager@company.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">BCC</Label>
                  <Input
                    placeholder="archive@company.com"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Merge Tag Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Insert dynamic merge tags:</span>
              <div className="flex gap-1.5">
                {["{{name}}", "{{company}}", "{{email}}"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag(tag)}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Body Rich Text Editor */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-medium">Email Content (HTML)</Label>
              <RichEditor value={html} onChange={setHtml} />
            </div>

            {/* Quick Test Send */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border bg-muted/20 text-xs">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Test preview send:</span>
              <Input
                placeholder="developer@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-8 text-xs flex-1 min-w-[180px]"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={sendingTest}
                onClick={sendTestPreview}
                className="h-8 text-xs shrink-0"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {sendingTest ? "Sending..." : "Send Preview"}
              </Button>
            </div>

            {/* Dispatch Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCampaign("draft")}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                Save as Draft
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setScheduleModalOpen(true)}
                disabled={isSubmitting || selectedRecipients.length === 0}
                className="gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                Schedule Campaign
              </Button>

              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={isSubmitting || selectedRecipients.length === 0}
                className="flex-1 bg-gradient-brand shadow-glow gap-1.5 text-xs font-semibold"
              >
                <Send className="h-4 w-4" />
                Send Now ({selectedRecipients.length} selected)
              </Button>
            </div>
          </GlassCard>

          {/* RIGHT: Recipient Management & Import */}
          <div className="space-y-4">
            {/* 1. File Upload Dropzone */}
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">2. Import Recipients</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportSavedContacts}
                  className="h-7 text-[11px] gap-1"
                >
                  <Users className="h-3 w-3" />
                  + Saved Contacts
                </Button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  dragActive
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border/60 hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processUploadedFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground text-center">
                  Drag & Drop Excel or CSV File
                </p>
                <p className="text-[11px] text-muted-foreground text-center mt-0.5">
                  Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong>. Auto-maps Email, Name, and Company.
                </p>
              </div>

              {/* Manual single email entry */}
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-2 border-t border-border/40">
                <Input
                  placeholder="Recipient Name"
                  value={manualNameInput}
                  onChange={(e) => setManualNameInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  type="email"
                  placeholder="email@company.com"
                  value={manualEmailInput}
                  onChange={(e) => setManualEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddManualRecipient()}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleAddManualRecipient}
                  disabled={!manualEmailInput.trim()}
                  className="h-8 text-xs"
                >
                  Add
                </Button>
              </div>
            </GlassCard>

            {/* 2. Recipient Preview Table & Actions */}
            <GlassCard className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">Recipient List</h4>
                  <Badge variant="default" className="text-[10px] h-5">
                    {selectedRecipients.length} / {recipients.length} Selected
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  {recipients.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSelectAll(selectedRecipients.length !== validCount)}
                        className="h-7 px-2 text-[11px]"
                      >
                        {selectedRecipients.length === validCount ? "Deselect All" : "Select All"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearAllRecipients}
                        className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Recipient summary pill bar */}
              {recipients.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] py-1 bg-muted/30 px-3 rounded-lg">
                  <span className="text-muted-foreground font-medium">List Health:</span>
                  <span className="text-success font-medium">✓ {validCount} valid</span>
                  {duplicateCount > 0 && (
                    <span className="text-amber-500 font-medium">⚠️ {duplicateCount} duplicate</span>
                  )}
                  {invalidCount > 0 && (
                    <span className="text-destructive font-medium">✕ {invalidCount} invalid format</span>
                  )}
                  {(duplicateCount > 0 || invalidCount > 0) && (
                    <button
                      type="button"
                      onClick={handleClearInvalid}
                      className="ml-auto text-primary underline text-[10px] hover:text-primary/80"
                    >
                      Remove invalid/duplicates
                    </button>
                  )}
                </div>
              )}

              {/* Search filter input */}
              {recipients.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or company…"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              )}

              {/* Scrollable Recipient Table */}
              <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1 border rounded-lg p-1 divide-y divide-border/20">
                {filteredRecipients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                    <p>No recipients imported yet.</p>
                    <p className="text-[11px]">Upload an Excel / CSV file or click "+ Saved Contacts" above.</p>
                  </div>
                ) : (
                  filteredRecipients.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                        r.selected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/40"
                      } ${!r.isValid ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={r.selected}
                          disabled={!r.isValid}
                          onCheckedChange={() => toggleSelectRecipient(r.id)}
                          className="h-3.5 w-3.5"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate max-w-[140px] text-foreground">
                              {r.name}
                            </span>
                            {r.company && (
                              <span className="text-[10px] px-1 rounded bg-muted text-muted-foreground truncate max-w-[100px]">
                                {r.company}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[210px]">
                            {r.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!r.isValid && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">
                            Invalid
                          </Badge>
                        )}
                        {r.isDuplicate && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 text-amber-500 border-amber-500/30">
                            Duplicate
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(r.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGN HISTORY */}
      {activeTab === "history" && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-semibold">Bulk Campaign History</h3>
              <p className="text-xs text-muted-foreground">
                All dispatched, scheduled, and draft campaigns recorded in PostgreSQL.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchCampaigns} disabled={loadingHistory} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="text-left text-muted-foreground uppercase tracking-wider border-b">
                <tr>
                  <th className="pb-2">Campaign Name</th>
                  <th>Status</th>
                  <th>Audience</th>
                  <th className="text-right">Sent</th>
                  <th className="text-right">Opens</th>
                  <th className="text-right">Clicks</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {historyCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No campaigns found. Switch to "New Campaign" to create and dispatch your first bulk email.
                    </td>
                  </tr>
                ) : (
                  historyCampaigns.map((c) => (
                    <tr key={c._id || c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-foreground">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.subject}</div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            c.status === "sent"
                              ? "default"
                              : c.status === "sending"
                              ? "outline"
                              : "secondary"
                          }
                          className="capitalize text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground">{c.audience || "Recipients"}</td>
                      <td className="text-right font-mono font-medium">{c.sent || 0}</td>
                      <td className="text-right font-mono">{c.opens || 0}</td>
                      <td className="text-right font-mono">{c.clicks || 0}</td>
                      <td className="text-muted-foreground">{c.date || c.createdAt?.slice(0, 10)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewCampaign(c)}
                            title="View delivery logs"
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicateCampaign(c._id || c.id)}
                            title="Duplicate as draft"
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCampaign(c._id || c.id)}
                            title="Delete campaign"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* CONFIRMATION MODAL (NEVER SEND WITHOUT USER CONFIRMATION) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/80">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary pb-1">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold">Confirm Bulk Dispatch</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Please verify your campaign parameters. Emails will ONLY be sent to the explicitly selected recipients listed below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs">
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between items-center py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Selected Recipients:</span>
                <Badge variant="default" className="text-[10px] h-5">
                  {selectedRecipients.length} Verified Recipient(s)
                </Badge>
              </div>

              <div className="flex justify-between items-center py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Subject Line:</span>
                <span className="font-semibold text-foreground truncate max-w-[220px]">
                  {subject}
                </span>
              </div>

              <div className="py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium block mb-1">Recipient Preview:</span>
                <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1 font-mono text-[11px]">
                  {selectedRecipients.slice(0, 8).map((r) => (
                    <div key={r.id} className="text-foreground truncate">
                      • {r.name} &lt;{r.email}&gt;
                    </div>
                  ))}
                  {selectedRecipients.length > 8 && (
                    <div className="text-muted-foreground text-[10px] italic">
                      + {selectedRecipients.length - 8} more recipients
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground font-medium">Email Delivery Service:</span>
                <span className="font-semibold text-primary">Brevo API (Transactional)</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => executeCampaign("send")}
              disabled={isSubmitting || selectedRecipients.length === 0}
              className="bg-gradient-brand shadow-glow gap-1.5"
            >
              {isSubmitting ? "Dispatching..." : "Confirm & Send Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE CAMPAIGN MODAL */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Bulk Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select the dispatch date and time. The background queue will automatically trigger delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Dispatch Date</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dispatch Time</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => executeCampaign("schedule")}
              disabled={isSubmitting}
              className="bg-gradient-brand shadow-glow gap-1.5"
            >
              <Clock className="h-4 w-4" />
              Schedule Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LIVE DISPATCH PROGRESS MODAL */}
      <Dialog open={progressModalOpen} onOpenChange={setProgressModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary animate-pulse" />
              Campaign Dispatch in Progress
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Brevo API is transmitting individual emails with rate-limit pacing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {campaignProgress.status === "sent"
                    ? "Completed - Delivered"
                    : campaignProgress.status === "failed"
                    ? "Failed - Delivery Issue"
                    : campaignProgress.status === "partially_sent"
                    ? "Partially Sent"
                    : "Sending via Brevo..."}
                </span>
                <span className="font-mono text-muted-foreground">
                  {campaignProgress.total > 0
                    ? Math.round((campaignProgress.sent / campaignProgress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  campaignProgress.total > 0
                    ? (campaignProgress.sent / campaignProgress.total) * 100
                    : 0
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <div className="text-lg font-bold text-foreground font-mono">{campaignProgress.total}</div>
                <div className="text-[10px] text-muted-foreground">Total Targets</div>
              </div>
              <div className="p-2.5 rounded-lg border bg-success/10 border-success/30">
                <div className="text-lg font-bold text-success font-mono">{campaignProgress.sent}</div>
                <div className="text-[10px] text-success">Delivered</div>
              </div>
              <div className="p-2.5 rounded-lg border bg-destructive/10 border-destructive/30">
                <div className="text-lg font-bold text-destructive font-mono">{campaignProgress.failed}</div>
                <div className="text-[10px] text-destructive">Failed</div>
              </div>
            </div>

            {campaignProgress.failed > 0 && campaignProgress.lastError && (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-destructive">Delivery Issue Detected</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {campaignProgress.lastError}
                    </p>
                  </div>
                </div>
                {campaignProgress.lastError.includes("authorised_ips") && (
                  <div className="pt-1">
                    <a
                      href="https://app.brevo.com/security/authorised_ips"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-[11px] hover:opacity-90 shadow-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Authorize Current IP in Brevo →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProgressModalOpen(false);
                setActiveTab("history");
              }}
            >
              View in Campaign History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW CAMPAIGN LOGS & DETAILS MODAL */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Campaign: {viewingCampaign?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Subject: "{viewingCampaign?.subject}" · Dispatched via Brevo API
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/20 text-center font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Sent</span>
                <span className="text-lg font-bold text-foreground">{viewingCampaign?.sent || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Opens</span>
                <span className="text-lg font-bold text-primary">{viewingCampaign?.opens || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Clicks</span>
                <span className="text-lg font-bold text-foreground">{viewingCampaign?.clicks || 0}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-xs">Recipient Delivery Logs</h4>
              <div className="max-h-60 overflow-y-auto border rounded-xl divide-y divide-border/20 p-1">
                {viewingCampaign?.emailLogs && viewingCampaign.emailLogs.length > 0 ? (
                  viewingCampaign.emailLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-2 text-xs">
                      <div>
                        <div className="font-medium text-foreground">{log.recipientName || log.recipientEmail}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{log.recipientEmail}</div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={log.status === "sent" ? "default" : "destructive"}
                          className="text-[9px] h-4 px-1 capitalize"
                        >
                          {log.status}
                        </Badge>
                        {log.error && (
                          <div className="text-[10px] text-destructive truncate max-w-xs">{log.error}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-muted-foreground text-xs">
                    No individual logs recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
