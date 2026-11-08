import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, Trash2, Download, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { GlassCard, PageHeader } from "@/components/kit";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contacts")({
  head: () => meta("Contacts", "Manage subscribers, tags and audience segments."),
  component: Contacts,
});

export function Contacts() {
  const { contacts } = useStore();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", tags: "" });

  // Bulk import state
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [rawText, setRawText] = useState("");
  const [importTags, setImportTags] = useState("imported, newsletter");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = [...new Set(contacts.items.flatMap((c) => c.tags))];
  const rows = useMemo(
    () =>
      contacts.items.filter(
        (c) =>
          (tag === "all" || c.tags.includes(tag)) &&
          (c.name + c.email + c.company).toLowerCase().includes(q.toLowerCase())
      ),
    [contacts.items, q, tag]
  );

  const save = async () => {
    if (!form.name || !/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error("Enter a name and valid email");
      return;
    }
    await contacts.add({
      name: form.name,
      email: form.email,
      company: form.company,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: "subscribed",
      addedAt: new Date().toISOString().slice(0, 10),
    });
    toast.success("Contact added");
    setOpen(false);
    setForm({ name: "", email: "", company: "", tags: "" });
  };

  const exportCsv = () => {
    const csv = [
      "name,email,company,tags,status",
      ...rows.map((c) => [c.name, c.email, c.company, c.tags.join("|"), c.status].join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "contacts-export.csv";
    a.click();
    toast.success("Contacts exported successfully");
  };

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      if (importMode === "file" && selectedFile) {
        const res = await contacts.importCsv(selectedFile);
        toast.success(`Import complete! ${res.added || 0} added, ${res.skipped || 0} skipped`);
      } else if (importMode === "paste" && rawText.trim()) {
        const lines = rawText.trim().split("\n");
        const parsed = lines
          .map((line) => {
            const parts = line.split(/[,\t]/).map((p) => p.trim());
            if (parts.length >= 2) {
              return {
                name: parts[0],
                email: parts[1],
                company: parts[2] || "",
                tags: importTags.split(",").map((t) => t.trim()).filter(Boolean),
              };
            } else if (parts[0] && parts[0].includes("@")) {
              const email = parts[0];
              return {
                name: email.split("@")[0],
                email,
                company: "",
                tags: importTags.split(",").map((t) => t.trim()).filter(Boolean),
              };
            }
            return null;
          })
          .filter(Boolean) as any[];

        if (parsed.length === 0) {
          toast.error("Could not parse any valid contacts from text");
          return;
        }

        const res = await contacts.bulkImport(parsed);
        toast.success(`Import complete! ${res.added || 0} added, ${res.skipped || 0} skipped`);
      } else {
        toast.error("Please provide a CSV file or paste contact lines");
        return;
      }

      setImportOpen(false);
      setRawText("");
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err.message || "Bulk import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${contacts.items.length} total contacts · ${contacts.items.filter((c) => c.status === "subscribed").length} active subscribers`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import Bulk List
            </Button>
            <Button onClick={() => setOpen(true)} className="bg-gradient-brand shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Add contact
            </Button>
          </div>
        }
      />

      <GlassCard>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts by name, email or company…"
              className="pl-9"
            />
          </div>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnimatePresence>
            {sel.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  variant="destructive"
                  onClick={() => {
                    contacts.remove([...sel]);
                    toast(`${sel.size} contacts deleted`);
                    setSel(new Set());
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete {sel.size}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8 pb-3">
                  <Checkbox
                    checked={rows.length > 0 && sel.size === rows.length}
                    onCheckedChange={(v) =>
                      setSel(v ? new Set(rows.map((r) => r._id)) : new Set())
                    }
                  />
                </th>
                <th>Contact</th>
                <th>Company</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <motion.tr layout key={c._id} className="border-t hover:bg-accent/40">
                  <td className="py-3">
                    <Checkbox
                      checked={sel.has(c._id)}
                      onCheckedChange={() =>
                        setSel((s) => {
                          const n = new Set(s);
                          n.has(c._id) ? n.delete(c._id) : n.add(c._id);
                          return n;
                        })
                      }
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground">
                        {c.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{c.company || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        contacts.update(c._id, {
                          status: c.status === "subscribed" ? "unsubscribed" : "subscribed",
                        })
                      }
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs capitalize cursor-pointer",
                        c.status === "subscribed"
                          ? "bg-success/15 text-success hover:bg-success/25"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {c.status}
                    </button>
                  </td>
                  <td className="text-muted-foreground">{c.addedAt}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No contacts found matching your criteria.
            </p>
          )}
        </div>
      </GlassCard>

      {/* Add Single Contact Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {(["name", "email", "company"] as const).map((k) => (
              <div key={k} className="grid gap-2">
                <Label className="capitalize">{k}</Label>
                <Input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder={k === "email" ? "alex@example.com" : ""}
                />
              </div>
            ))}
            <div className="grid gap-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="lead, vip, customer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} className="bg-gradient-brand">
              Save Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import List Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import Bulk Email List
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 rounded-xl bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setImportMode("file")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 font-medium transition-colors",
                  importMode === "file" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                )}
              >
                Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => setImportMode("paste")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 font-medium transition-colors",
                  importMode === "paste" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                )}
              >
                Paste Emails / Text
              </button>
            </div>

            {importMode === "file" ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <div className="font-semibold text-sm text-foreground flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready to import
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      Click or drag and drop your CSV file
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Supports headers: Name, Email, Company, Tags
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Paste Lines (Name, Email, Company)</Label>
                <Textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Sophia White, sophia@acme.com, Acme\nDavid Miller, david@stripe.com, Stripe\nsarah@notion.so`}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  One contact per line, comma or tab-separated. Plain emails are also accepted.
                </p>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>Attach tags to all imported contacts</Label>
              <Input
                value={importTags}
                onChange={(e) => setImportTags(e.target.value)}
                placeholder="imported, batch-2026"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={importing}
              className="bg-gradient-brand shadow-glow"
            >
              {importing ? "Importing…" : "Start Bulk Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
