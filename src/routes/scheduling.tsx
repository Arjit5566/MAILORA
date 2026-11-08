import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Pencil,
  Mail,
  Users,
  Search,
  Globe,
  Sparkles,
  Send,
  RefreshCw,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { ScheduledEmail } from "@/lib/api";
import { GlassCard, PageHeader } from "@/components/kit";
import { RichEditor } from "@/components/RichEditor";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/scheduling")({
  head: () => meta("Email Scheduling", "Interactive calendar and BullMQ queue manager for scheduled email dispatches."),
  component: SchedulingPage,
});

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Common world timezones
const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function getSmartFutureTime(minutesAhead: number = 15): string {
  const d = new Date(Date.now() + minutesAhead * 60 * 1000);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function parseScheduleDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, hours, minutes, 0, 0);
}

function formatCountdown(dateStr: string, timeStr: string): string {
  const target = parseScheduleDateTime(dateStr, timeStr).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return "Due / Processing";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `In ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `In ${hours}h ${mins}m`;
  }
  return `In ${mins}m ${secs}s`;
}

export function SchedulingPage() {
  const { schedules, templates, contacts, refresh } = useStore();

  // Calendar Cursor
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<string>(iso(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create / Edit Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledEmail | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(
    "<h2>Hello {{name}},</h2><p>Here is your planned update from {{company}}.</p><p>Please find the scheduled update details below. Reply to this email if you need any assistance.</p><p>Warm regards,<br/><strong>Arjit Tripathi</strong></p>"
  );
  const [date, setDate] = useState(iso(new Date()));
  const [time, setTime] = useState(() => getSmartFutureTime(15));
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });

  // Recipient Selection State
  const [recipientMode, setRecipientMode] = useState<"contacts" | "manual" | "audience">("contacts");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState("");
  const [audienceTag, setAudienceTag] = useState("All subscribers");
  const [contactSearch, setContactSearch] = useState("");

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Live Timer ticker for countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const today = iso(new Date());

  // Calendar Calculation
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const shiftMonth = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  // Contacts Filtering
  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase().trim();
    const subs = contacts.items.filter((c) => c.status !== "unsubscribed" && c.status !== "bounced");
    if (!q) return subs;
    return subs.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [contacts.items, contactSearch]);

  // Open Form to create
  const openForNew = (targetDate: string = iso(new Date())) => {
    setEditingJob(null);
    setTitle("");
    setSubject("");
    setHtml(
      "<h2>Hello {{name}},</h2><p>Here is your planned update from {{company}}.</p><p>Please find the scheduled update details below. Reply to this email if you need any assistance.</p><p>Warm regards,<br/><strong>Arjit Tripathi</strong></p>"
    );
    setDate(targetDate);
    setTime(getSmartFutureTime(15));
    setSelectedContactIds([]);
    setManualEmails("");
    setAudienceTag("All subscribers");
    setRecipientMode("contacts");
    setOpenModal(true);
  };

  // Open Form to edit
  const openForEdit = (job: ScheduledEmail) => {
    setEditingJob(job);
    setTitle(job.title);
    setSubject(job.subject || job.title);
    setHtml(job.html || "");
    setDate(job.date);
    setTime(job.time);
    if (job.timezone) setTimezone(job.timezone);

    if (job.recipients) {
      try {
        const parsed = JSON.parse(job.recipients);
        if (Array.isArray(parsed)) {
          setManualEmails(parsed.map((r: any) => r.email).join(", "));
          setRecipientMode("manual");
        }
      } catch {
        // ignore
      }
    }
    setOpenModal(true);
  };

  // Toggle contact selection
  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Save / Validate
  const handleInitiateSave = () => {
    if (!title.trim()) {
      toast.error("Please provide a title for this scheduled campaign");
      return;
    }
    if (!date || !time) {
      toast.error("Please pick a valid date and time");
      return;
    }

    const scheduledDateObj = parseScheduleDateTime(date, time);
    if (isNaN(scheduledDateObj.getTime())) {
      toast.error("Invalid date or time");
      return;
    }

    // Allow 5 minutes grace window so minor clock drifts or a few seconds elapsed don't block the user
    const diffMs = scheduledDateObj.getTime() - Date.now();
    if (diffMs < -300000) {
      toast.error("Cannot schedule an email in the past. Please pick a time in the future.");
      return;
    }

    if (recipientMode === "contacts" && selectedContactIds.length === 0) {
      toast.error("Please select at least one contact to receive this email");
      return;
    }

    if (recipientMode === "manual" && !manualEmails.trim()) {
      toast.error("Please enter at least one manual recipient email address");
      return;
    }

    setConfirmOpen(true);
  };

  // Final confirmed save
  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // Build recipients
      const recipientsList: Array<{ email: string; name?: string; company?: string }> = [];

      if (recipientMode === "contacts") {
        selectedContactIds.forEach((id) => {
          const c = contacts.items.find((x) => x._id === id);
          if (c) {
            recipientsList.push({
              email: c.email.toLowerCase().trim(),
              name: c.name,
              company: c.company,
            });
          }
        });
      } else if (recipientMode === "manual") {
        const tokens = manualEmails.split(/[,;\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
        tokens.forEach((em) => {
          if (em.includes("@")) {
            recipientsList.push({
              email: em,
              name: em.split("@")[0] || "Recipient",
            });
          }
        });
      }

      const audienceStr =
        recipientsList.length > 0
          ? `${recipientsList.length} selected recipient(s)`
          : audienceTag;

      if (editingJob) {
        await schedules.update(editingJob._id, {
          title: title.trim(),
          subject: (subject || title).trim(),
          html,
          date,
          time,
          timezone,
          audience: audienceStr,
          recipients: JSON.stringify(recipientsList),
        });
        toast.success(`Updated and rescheduled for ${date} at ${time}`);
      } else {
        await schedules.add({
          title: title.trim(),
          subject: (subject || title).trim(),
          html,
          date,
          time,
          timezone,
          audience: audienceStr,
          recipients: JSON.stringify(recipientsList),
        });
        toast.success(`Scheduled send for ${date} at ${time} (${timezone})`);
      }

      setConfirmOpen(false);
      setOpenModal(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule email");
    } finally {
      setIsSaving(false);
    }
  };

  // Control actions
  const handlePause = async (id: string) => {
    try {
      await schedules.pause(id);
      toast.info("Scheduled campaign paused");
    } catch (err: any) {
      toast.error(err.message || "Failed to pause");
    }
  };

  const handleResume = async (id: string) => {
    try {
      await schedules.resume(id);
      toast.success("Scheduled campaign resumed");
    } catch (err: any) {
      toast.error(err.message || "Failed to resume");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await schedules.cancel(id);
      toast.warning("Scheduled campaign cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    }
  };

  const handleRunNow = async (id: string, jobTitle: string) => {
    try {
      await schedules.runNow(id);
      toast.success(`Triggered "${jobTitle}" immediately via Brevo API`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger send");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await schedules.remove(id);
      toast.success("Schedule removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  // Filtered schedules for queue list
  const filteredQueue = useMemo(() => {
    return [...schedules.items]
      .filter((s) => {
        if (statusFilter === "all") return true;
        return s.status === statusFilter;
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [schedules.items, statusFilter]);

  // Selected date's jobs
  const selectedDateJobs = useMemo(() => {
    return schedules.items.filter((s) => s.date === selectedDate);
  }, [schedules.items, selectedDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Scheduling System"
        description="Plan, automate and execute campaigns with Redis, BullMQ background queues and Brevo API."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refresh()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => openForNew(today)} className="bg-gradient-brand shadow-glow gap-1.5">
              <Plus className="h-4 w-4" /> Schedule Campaign
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: INTERACTIVE MONTH CALENDAR */}
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {cursor.toLocaleString("en", { month: "long", year: "numeric" })}
              </h3>
              <p className="text-xs text-muted-foreground">Click any day to view or schedule sends</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setCursor(new Date(new Date().setDate(1)))}
              >
                Today
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Day of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground py-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => {
              const key = iso(d);
              const items = schedules.items.filter((s) => s.date === key);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isSelected = selectedDate === key;
              const isToday = key === today;

              return (
                <motion.div
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative flex min-h-[78px] md:min-h-[92px] flex-col rounded-xl border p-1.5 text-left text-xs cursor-pointer transition-all",
                    !inMonth && "opacity-35 bg-muted/10",
                    isToday && "ring-2 ring-primary/80 bg-primary/5",
                    isSelected && "border-primary shadow-sm bg-primary/10",
                    !isSelected && !isToday && "hover:border-primary/40 bg-card/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-semibold", isToday && "text-primary font-bold")}>
                      {d.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-mono px-1 rounded-full bg-primary/20 text-primary font-bold">
                        {items.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden flex-1">
                    {items.slice(0, 2).map((s) => {
                      const isSent = s.status === "sent";
                      const isPaused = s.status === "paused";
                      const isCancelled = s.status === "cancelled";

                      return (
                        <div
                          key={s._id}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight",
                            isSent
                              ? "bg-muted text-muted-foreground"
                              : isPaused
                              ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                              : isCancelled
                              ? "bg-destructive/15 text-destructive border border-destructive/20 line-through"
                              : "bg-primary text-primary-foreground font-semibold shadow-xs"
                          )}
                          title={`${s.time} - ${s.title}`}
                        >
                          {s.time} {s.title}
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <span className="text-[9px] text-muted-foreground font-semibold block text-center">
                        +{items.length - 2} more
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Selected Date Summary & Quick Action */}
          <div className="p-3 rounded-xl border bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                Selected: <strong>{selectedDate}</strong> ({selectedDateJobs.length} scheduled)
              </span>
            </div>
            <Button size="sm" onClick={() => openForNew(selectedDate)} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Schedule on {selectedDate}
            </Button>
          </div>
        </GlassCard>

        {/* RIGHT: UPCOMING QUEUE & SCHEDULED CAMPAIGNS */}
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-base font-semibold">Scheduled Campaigns</h3>
              <p className="text-xs text-muted-foreground">Managed by BullMQ background jobs & Brevo</p>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1">
              {["all", "scheduled", "sent", "failed", "paused", "cancelled"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors",
                    statusFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Jobs List */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            <AnimatePresence>
              {filteredQueue.map((job) => {
                const isSent = job.status === "sent";
                const isFailed = job.status === "failed";
                const isProcessing = job.status === "processing";
                const isPaused = job.status === "paused";
                const isCancelled = job.status === "cancelled";
                const countdown = formatCountdown(job.date, job.time);

                return (
                  <motion.div
                    key={job._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group rounded-xl border p-3.5 transition-all bg-card/60 hover:bg-card space-y-2",
                      isProcessing && "border-primary/50 ring-1 ring-primary/30",
                      isPaused && "border-amber-500/30",
                      isFailed && "border-destructive/30 bg-destructive/5",
                      isCancelled && "opacity-60 border-destructive/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate text-foreground">
                            {job.title}
                          </h4>
                          <Badge
                            variant={
                              isSent
                                ? "default"
                                : isFailed
                                ? "destructive"
                                : isProcessing
                                ? "outline"
                                : isPaused
                                ? "outline"
                                : isCancelled
                                ? "destructive"
                                : "secondary"
                            }
                            className={cn(
                              "text-[10px] h-5 capitalize shrink-0",
                              isProcessing && "border-primary text-primary animate-pulse",
                              isPaused && "border-amber-500 text-amber-500",
                              isFailed && "bg-destructive/15 text-destructive border-destructive/40"
                            )}
                          >
                            {job.status || "scheduled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          "{job.subject || job.title}" · {job.audience}
                        </p>
                      </div>

                      {/* Countdown Badge */}
                      {!isSent && !isCancelled && !isFailed && (
                        <div className="shrink-0 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold",
                              isPaused
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {isPaused ? "Paused" : countdown}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Failure diagnostic banner */}
                    {isFailed && (
                      <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-[11px] space-y-1.5">
                        <div className="flex items-start gap-1.5 text-destructive font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{job.error || "Scheduled dispatch could not be completed"}</span>
                        </div>
                        {job.error?.includes("authorised_ips") && (
                          <div className="pt-0.5">
                            <a
                              href="https://app.brevo.com/security/authorised_ips"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary underline hover:text-primary/80"
                            >
                              <ExternalLink className="h-3 w-3" /> Authorize Current IP in Brevo Settings →
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>
                          {job.date} at {job.time} {job.timezone ? `(${job.timezone})` : ""}
                        </span>
                      </div>

                      {/* Action buttons toolbar */}
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        {!isSent && !isCancelled && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary hover:bg-primary/10"
                              title="Send Immediately (Run Now)"
                              onClick={() => handleRunNow(job._id, job.title)}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>

                            {isPaused ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-success hover:bg-success/10"
                                title="Resume Dispatch"
                                onClick={() => handleResume(job._id)}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                                title="Pause Job"
                                onClick={() => handlePause(job._id)}
                              >
                                <Pause className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-foreground hover:bg-muted"
                              title="Edit / Reschedule"
                              onClick={() => openForEdit(job)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Cancel Schedule"
                              onClick={() => handleCancel(job._id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Schedule"
                          onClick={() => handleDelete(job._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredQueue.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p>No scheduled campaigns found matching filter.</p>
                <p className="text-[11px]">Click "Schedule Campaign" to plan an upcoming dispatch.</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* CREATE & EDIT SCHEDULE MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {editingJob ? "Edit / Reschedule Campaign" : "Schedule New Email Dispatch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define target recipients, email content, and exact dispatch date/time with timezone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Campaign Name & Template */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Campaign Title</Label>
                <Input
                  placeholder="e.g. November Product Digest"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start from Template (Optional)</Label>
                <Select
                  onValueChange={(id) => {
                    const t = templates.items.find((x) => x._id === id);
                    if (t) {
                      setTitle(t.name);
                      setSubject(t.subject);
                      setHtml(t.html);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.items.map((t) => (
                      <SelectItem key={t._id} value={t._id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. Subject Line */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subject Line</Label>
              <Input
                placeholder="e.g. Important Update for {{name}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* 3. Date, Time & Timezone Pickers */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Dispatch Date
                </Label>
                <Input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Dispatch Time
                </Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz} className="text-xs">
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. Recipient Selection */}
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Select Target Recipients
                </Label>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRecipientMode("contacts")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                      recipientMode === "contacts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Saved Contacts ({selectedContactIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("manual")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                      recipientMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Manual Email(s)
                  </button>
                </div>
              </div>

              {recipientMode === "contacts" && (
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts…"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-border/20 border rounded-lg p-1">
                    {filteredContacts.map((c) => {
                      const isChecked = selectedContactIds.includes(c._id);
                      return (
                        <div
                          key={c._id}
                          onClick={() => toggleContact(c._id)}
                          className={cn(
                            "flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors",
                            isChecked ? "bg-primary/10 font-medium" : "hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={isChecked} onCheckedChange={() => toggleContact(c._id)} />
                            <span>{c.name}</span>
                            <span className="text-muted-foreground font-mono text-[11px]">({c.email})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {recipientMode === "manual" && (
                <div className="space-y-1.5 pt-1">
                  <Input
                    placeholder="Enter recipient emails separated by commas (e.g. client1@test.com, client2@test.com)"
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Emails will be delivered ONLY to the explicit addresses specified above.
                  </p>
                </div>
              )}
            </div>

            {/* 5. Email Body Editor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Content (HTML)</Label>
              <RichEditor value={html} onChange={setHtml} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitiateSave} className="bg-gradient-brand shadow-glow gap-1.5">
              <Clock className="h-4 w-4" />
              {editingJob ? "Save Changes" : "Confirm Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION BEFORE SCHEDULING (NEVER SEND WITHOUT EXPLICIT CONFIRMATION) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary pb-1">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold">Confirm Email Schedule</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Please verify the scheduled dispatch details below before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Campaign Title:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{title}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Scheduled Time:</span>
                <span className="font-mono font-semibold text-primary">
                  {date} at {time} ({timezone})
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Recipients:</span>
                <span className="font-semibold text-foreground">
                  {recipientMode === "contacts"
                    ? `${selectedContactIds.length} contact(s)`
                    : `${manualEmails.split(/[,;\s]+/).filter((e) => e.includes("@")).length} email(s)`}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground font-medium">Email Provider:</span>
                <span className="font-medium text-foreground">Brevo API (Delayed BullMQ Queue)</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="bg-gradient-brand shadow-glow gap-1.5"
            >
              {isSaving ? "Scheduling..." : "Schedule Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
