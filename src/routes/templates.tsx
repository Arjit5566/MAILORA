import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Sparkles,
  Copy,
  Check,
  Eye,
  Send,
  Smartphone,
  Monitor,
  Search,
  Code2,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Tag,
  CopyCheck,
  SlidersHorizontal,
  X,
  FileText,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Template } from "@/lib/api";
import { GlassCard, PageHeader } from "@/components/kit";
import { RichEditor } from "@/components/RichEditor";
import { meta } from "@/lib/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/templates")({
  head: () =>
    meta(
      "Templates — SendFlow Studio",
      "Interactive, responsive email templates with live mobile & desktop preview."
    ),
  component: Templates,
});

// Category theme colors for visual tagging
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Onboarding: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  Product: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" },
  Newsletter: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  Sales: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  Promotional: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  "E-Commerce": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
  Events: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
  Engagement: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", dot: "bg-sky-400" },
  Billing: { bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/30", dot: "bg-slate-400" },
  Referral: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/30", dot: "bg-fuchsia-400" },
  "Case Study": { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30", dot: "bg-teal-400" },
  "Follow-up": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  Security: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
  Transactional: { bg: "bg-zinc-500/10", text: "text-zinc-300", border: "border-zinc-500/30", dot: "bg-zinc-400" },
};

export function Templates() {
  const { templates } = useStore();
  const navigate = useNavigate();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "alpha" | "category">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Create / Edit modal state
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Marketing", subject: "", html: "" });

  // Interactive Live Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTab, setPreviewTab] = useState<"visual" | "html">("visual");
  const [simulateVariables, setSimulateVariables] = useState(true);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Send Test modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [targetTemplate, setTargetTemplate] = useState<Template | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [loadingStarter, setLoadingStarter] = useState(false);

  const handleLoadStarterTemplates = async () => {
    setLoadingStarter(true);
    try {
      const res = await (templates as any).seedStarter();
      toast.success(res?.message || "Starter templates loaded!", {
        description: "High-converting responsive templates are now ready in your library.",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load starter templates");
    } finally {
      setLoadingStarter(false);
    }
  };

  // Categories list with item counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: templates.items.length };
    for (const t of templates.items) {
      map[t.category] = (map[t.category] || 0) + 1;
    }
    return map;
  }, [templates.items]);

  const categoryList = useMemo(() => {
    const unique = Array.from(new Set(templates.items.map((t) => t.category))).sort();
    return ["All", ...unique];
  }, [templates.items]);

  // Filter & sort templates
  const filteredTemplates = useMemo(() => {
    let list = templates.items.filter((t) => {
      const matchCat = selectedCat === "All" || t.category === selectedCat;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.html.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    if (sortBy === "alpha") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "category") {
      list = [...list].sort((a, b) => a.category.localeCompare(b.category));
    } else {
      // Newest (default)
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    return list;
  }, [templates.items, selectedCat, searchQuery, sortBy]);

  // Extract detected merge tags from HTML string
  const getMergeTags = (html: string) => {
    const matches = html.match(/{{\s*[\w_.]+\s*}}/g) || [];
    return Array.from(new Set(matches)).slice(0, 3);
  };

  // Estimate read time
  const getReadTime = (html: string) => {
    const text = html.replace(/<[^>]*>/g, " ");
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(wordCount / 180));
    return `${minutes} min read (${wordCount} words)`;
  };

  // Replace tags for preview simulation
  const getSimulatedHtml = (html: string, simulate: boolean) => {
    if (!simulate) return html;
    return html
      .replace(/{{\s*name\s*}}/gi, "Arjit Sharma")
      .replace(/{{\s*first_name\s*}}/gi, "Arjit")
      .replace(/{{\s*company\s*}}/gi, "SendFlow Studio")
      .replace(/{{\s*email\s*}}/gi, "arjitripathi0607@gmail.com")
      .replace(/{{\s*unsubscribe_link\s*}}/gi, "https://mailora-lyart.vercel.app/unsubscribe");
  };

  // Open Edit or New
  const start = (t?: Template) => {
    setEditing(t ?? null);
    setForm(
      t
        ? { name: t.name, category: t.category, subject: t.subject, html: t.html }
        : {
            name: "",
            category: "Product",
            subject: "",
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <div style="background: #4f46e5; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Hello, {{name}}!</h2>
  </div>
  <div style="background: #ffffff; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Here is your curated update from {{company}}.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://mailora-lyart.vercel.app" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Get Started</a>
    </div>
  </div>
</div>`,
          }
    );
    setOpen(true);
  };

  // Save template
  const save = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Template name and subject line are required");
      return;
    }
    try {
      if (editing) {
        await templates.update(editing._id, form);
        toast.success("Template updated successfully");
      } else {
        await templates.add(form);
        toast.success("New template saved to database");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    }
  };

  // Duplicate template
  const handleDuplicate = async (t: Template) => {
    try {
      await templates.add({
        name: `${t.name} (Copy)`,
        category: t.category,
        subject: t.subject,
        html: t.html,
      });
      toast.success(`Duplicated "${t.name}" successfully`);
    } catch (err: any) {
      toast.error(err.message || "Could not duplicate template");
    }
  };

  // Copy HTML to clipboard
  const handleCopyHtml = (html: string, name: string) => {
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
    toast.success("HTML copied to clipboard", {
      description: `Raw markup for "${name}" ready to paste.`,
    });
  };

  // Launch campaign with this template
  const handleUseInCampaign = (t: Template) => {
    navigate({ to: "/campaigns", search: { templateId: t._id } });
  };

  // Send test email
  const handleSendTest = async () => {
    if (!targetTemplate || !testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address");
      return;
    }
    setSendingTest(true);
    try {
      const res = await templates.testSend(targetTemplate._id, testEmail);
      toast.success(res?.message || "Test email dispatched successfully!", {
        description: `Delivered to ${testEmail} via Gmail SMTP`,
      });
      if (res?.previewUrl) window.open(res.previewUrl, "_blank");
      setTestModalOpen(false);
      setTestEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to deliver test template");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Email Templates"
        description="Browse, customize, and preview responsive email templates built for maximum inbox placement and conversion."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleLoadStarterTemplates}
              disabled={loadingStarter}
              className="rounded-2xl border-border/80 bg-card/80 hover:bg-accent/80 text-xs gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {loadingStarter ? "Loading..." : "Load Starter Pack"}
            </Button>
            <Button
              onClick={() => start()}
              className="bg-gradient-brand shadow-glow hover:opacity-95 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Template
            </Button>
          </div>
        }
      />

      {/* Interactive Statistics Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-r from-card/90 via-card/60 to-primary/5 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> High-Deliverability Template Library
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {templates.items.length} Ready-to-Use Responsive Templates
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Standard-compliant dual-part HTML designed to pass Gmail and Outlook spam heuristics with zero layout breakage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border/80 bg-background/60 px-4 py-2 text-center shadow-xs">
              <div className="text-xs text-muted-foreground">Categories</div>
              <div className="text-lg font-bold text-foreground">{categoryList.length - 1}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/60 px-4 py-2 text-center shadow-xs">
              <div className="text-xs text-muted-foreground">Supported Tags</div>
              <div className="text-lg font-bold text-primary">4 Variables</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Search, Filter, and View Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by title, subject, or keywords..."
              className="h-10 pl-10 pr-9 rounded-2xl bg-card/80 border-border/80 focus:border-primary text-sm shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort & View Controls */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 rounded-2xl gap-2 text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    Sort:{" "}
                    {sortBy === "newest"
                      ? "Newest First"
                      : sortBy === "alpha"
                      ? "Alphabetical (A-Z)"
                      : "By Category"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSortBy("newest")}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("alpha")}>
                  Alphabetical (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("category")}>
                  Group by Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center rounded-2xl border border-border/80 bg-muted/40 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-xl transition-colors ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-xl transition-colors ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills with Badge Counts */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {categoryList.map((c) => {
            const count = categoryCounts[c] || 0;
            const isSelected = selectedCat === c;
            return (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs scale-102 font-semibold"
                    : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span>{c}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center backdrop-blur-xl">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-foreground">
            {templates.items.length === 0 ? "Your template library is empty" : "No templates match your search"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {templates.items.length === 0
              ? "Load our curated starter template pack featuring onboarding, newsletters, product launches, and sales outreach."
              : "Try adjusting your category filter or search keywords, or create a brand new template."}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {templates.items.length === 0 ? (
              <Button
                size="sm"
                onClick={handleLoadStarterTemplates}
                disabled={loadingStarter}
                className="rounded-xl bg-gradient-brand shadow-glow text-white"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {loadingStarter ? "Loading Templates..." : "Load Starter Template Pack"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCat("All");
                }}
                variant="outline"
                className="rounded-xl"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && filteredTemplates.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((t, i) => {
            const theme = CATEGORY_COLORS[t.category] || {
              bg: "bg-primary/10",
              text: "text-primary",
              border: "border-primary/30",
              dot: "bg-primary",
            };
            const tags = getMergeTags(t.html);

            return (
              <GlassCard
                key={t._id}
                delay={i * 0.03}
                whileHover={{ y: -5 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/80 p-0 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
              >
                {/* Visual macOS Browser Bar Header */}
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${theme.bg} ${theme.text} ${theme.border}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                    {t.category}
                  </span>
                </div>

                {/* Live Scaled Preview Container */}
                <div className="relative h-48 overflow-hidden bg-background/50 p-4 select-none">
                  <div
                    className="pointer-events-none origin-top-left scale-[0.78] w-[128%] text-xs leading-relaxed opacity-90 font-sans"
                    dangerouslySetInnerHTML={{ __html: t.html }}
                  />
                  {/* Subtle fade gradient bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/70 to-transparent" />

                  {/* Interactive Action Overlay on Hover */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-background/85 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate(t);
                          setPreviewModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 px-3 text-xs shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Full Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUseInCampaign(t)}
                        className="bg-gradient-brand hover:opacity-95 text-white rounded-xl h-9 px-3 text-xs shadow-glow"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" /> Use in Campaign
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => start(t)}
                        className="h-8 rounded-xl px-2.5 text-xs"
                        title="Edit Template"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setTargetTemplate(t);
                          setTestModalOpen(true);
                        }}
                        className="h-8 rounded-xl px-2.5 text-xs"
                        title="Send Test Email"
                      >
                        <Mail className="h-3.5 w-3.5 mr-1" /> Test
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyHtml(t.html, t.name)}
                        className="h-8 rounded-xl px-2.5 text-xs"
                        title="Copy Raw HTML"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDuplicate(t)}
                        className="h-8 rounded-xl px-2.5 text-xs"
                        title="Duplicate Template"
                      >
                        <CopyCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          templates.remove(t._id);
                          toast.success(`Deleted "${t.name}"`);
                        }}
                        className="h-8 rounded-xl px-2 text-xs"
                        title="Delete Template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Card Meta Content */}
                <div className="flex-1 p-4 flex flex-col justify-between border-t border-border/60 bg-card/60">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {t.name}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground font-mono">
                      Subject: {t.subject}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{getReadTime(t.html).split(" (")[0]}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {tags.length > 0 ? (
                        tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Standard text</span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && filteredTemplates.length > 0 && (
        <div className="rounded-3xl border border-border/80 bg-card/70 overflow-hidden shadow-sm backdrop-blur-xl divide-y divide-border/60">
          {filteredTemplates.map((t) => {
            const theme = CATEGORY_COLORS[t.category] || {
              bg: "bg-primary/10",
              text: "text-primary",
              border: "border-primary/30",
              dot: "bg-primary",
            };

            return (
              <div
                key={t._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${theme.bg} ${theme.text} ${theme.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                      {t.category}
                    </span>
                    <h4 className="font-semibold text-sm text-foreground">{t.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Subject: {t.subject}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewTemplate(t);
                      setPreviewModalOpen(true);
                    }}
                    className="h-8 rounded-xl text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUseInCampaign(t)}
                    className="h-8 rounded-xl text-xs bg-gradient-brand text-white shadow-glow"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Use
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => start(t)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Template
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setTargetTemplate(t);
                          setTestModalOpen(true);
                        }}
                      >
                        <Mail className="h-3.5 w-3.5 mr-2" /> Send Test
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyHtml(t.html, t.name)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copy HTML
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                        <CopyCheck className="h-3.5 w-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          templates.remove(t._id);
                          toast.success(`Deleted "${t.name}"`);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Interactive Live Full-Screen Preview Dialog                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border-border/80 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  {previewTemplate?.name || "Template Preview"}
                </DialogTitle>
                {previewTemplate && (
                  <Badge variant="outline" className="text-xs">
                    {previewTemplate.category}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                Subject: {previewTemplate?.subject}
              </p>
            </div>

            {/* Device & Mode Toggles */}
            <div className="flex items-center gap-3">
              {/* Desktop vs Mobile Toggle */}
              <div className="flex items-center rounded-2xl border border-border/80 bg-background/80 p-1 shadow-xs">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    previewDevice === "desktop"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    previewDevice === "mobile"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>

              {/* Visual vs Code Toggle */}
              <div className="flex items-center rounded-2xl border border-border/80 bg-background/80 p-1 shadow-xs">
                <button
                  onClick={() => setPreviewTab("visual")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    previewTab === "visual"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setPreviewTab("html")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    previewTab === "html"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  HTML Code
                </button>
              </div>
            </div>
          </div>

          {/* Subheader: Simulation Control */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/15 px-6 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Switch
                id="sim-tags"
                checked={simulateVariables}
                onCheckedChange={setSimulateVariables}
              />
              <Label htmlFor="sim-tags" className="text-xs cursor-pointer text-muted-foreground">
                Simulate merge tags (<code className="text-primary font-mono text-[11px]">{"{{name}}"}</code> &rarr; Arjit Sharma)
              </Label>
            </div>

            {previewTemplate && (
              <span className="text-[11px] text-muted-foreground">
                {getReadTime(previewTemplate.html)}
              </span>
            )}
          </div>

          {/* Body Viewer */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/20 flex items-center justify-center min-h-[420px]">
            {previewTab === "visual" && previewTemplate && (
              <div
                className={`transition-all duration-300 ${
                  previewDevice === "desktop"
                    ? "w-full max-w-[620px] rounded-2xl border border-border/80 bg-background shadow-xl overflow-hidden"
                    : "w-[375px] rounded-[36px] border-[10px] border-neutral-900 bg-background shadow-2xl overflow-hidden"
                }`}
              >
                {/* Mobile Device Header Shell */}
                {previewDevice === "mobile" && (
                  <div className="bg-neutral-900 h-6 flex items-center justify-center">
                    <div className="h-3.5 w-24 bg-neutral-800 rounded-full" />
                  </div>
                )}

                {/* Simulated Email Client Bar */}
                <div className="border-b border-border/70 bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>From: <strong>SendFlow Studio</strong> &lt;notifications@sendflow.app&gt;</span>
                    <span className="text-[10px]">Today, 10:45 AM</span>
                  </div>
                  <div className="font-semibold text-foreground truncate">
                    Subject: {previewTemplate.subject}
                  </div>
                </div>

                {/* Rendered HTML */}
                <div
                  className="p-4 sm:p-6 text-sm bg-white text-slate-900 overflow-x-auto leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: getSimulatedHtml(previewTemplate.html, simulateVariables),
                  }}
                />

                {/* Mobile Home Bar */}
                {previewDevice === "mobile" && (
                  <div className="bg-neutral-900 h-5 flex items-center justify-center">
                    <div className="h-1 w-28 bg-neutral-600 rounded-full" />
                  </div>
                )}
              </div>
            )}

            {previewTab === "html" && previewTemplate && (
              <div className="w-full h-full relative rounded-2xl border border-border/80 bg-neutral-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyHtml(previewTemplate.html, previewTemplate.name)}
                  className="absolute right-3 top-3 h-8 text-xs gap-1.5"
                >
                  {copiedHtml ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedHtml ? "Copied" : "Copy Code"}
                </Button>
                <pre className="whitespace-pre-wrap pt-8">{previewTemplate.html}</pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-muted/30">
            <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTargetTemplate(previewTemplate);
                  setTestModalOpen(true);
                }}
              >
                <Mail className="h-4 w-4 mr-1.5" /> Send Test
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewModalOpen(false);
                  if (previewTemplate) start(previewTemplate);
                }}
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit Template
              </Button>
              <Button
                onClick={() => {
                  setPreviewModalOpen(false);
                  if (previewTemplate) handleUseInCampaign(previewTemplate);
                }}
                className="bg-gradient-brand text-white shadow-glow"
              >
                <Send className="h-4 w-4 mr-1.5" /> Use in Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Template Edit / Create Dialog                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? `Edit Template: ${editing.name}` : "Create New Email Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Template Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. VIP Product Launch Series"
                  className="rounded-xl"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Product, Onboarding, Sales, Newsletter..."
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Email Subject Line</Label>
                <span className="text-[11px] text-muted-foreground">
                  {form.subject.length} chars{" "}
                  {form.subject.length >= 30 && form.subject.length <= 60 ? (
                    <span className="text-emerald-500 font-semibold">(Ideal length)</span>
                  ) : null}
                </span>
              </div>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Welcome to {{company}}, {{name}}!"
                className="rounded-xl font-mono text-sm"
              />
            </div>

            {/* Merge Tag Inserter Helper */}
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Click to Insert Merge Tag:
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Auto-populated on dispatch
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{{name}}", label: "Recipient Name" },
                  { tag: "{{first_name}}", label: "First Name" },
                  { tag: "{{company}}", label: "Company" },
                  { tag: "{{email}}", label: "Email Address" },
                  { tag: "{{unsubscribe_link}}", label: "Unsubscribe Link" },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, html: f.html + ` ${tag}` }));
                      toast.info(`Inserted ${tag}`);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-mono font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span>{tag}</span>
                    <span className="text-[10px] text-muted-foreground">({label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rich Editor */}
            <div className="space-y-1.5">
              <Label>HTML Email Body</Label>
              <RichEditor value={form.html} onChange={(html) => setForm((f) => ({ ...f, html }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} className="bg-gradient-brand text-white shadow-glow">
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Send Test Email Modal                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Send Template Test Email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Send a test preview of template <strong>"{targetTemplate?.name}"</strong> with sample tags populated directly to your inbox via Gmail SMTP.
            </p>
            <div className="grid gap-1.5">
              <Label>Recipient Email Address</Label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={sendingTest}
              className="bg-gradient-brand text-white shadow-glow"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {sendingTest ? "Sending…" : "Send Test Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
