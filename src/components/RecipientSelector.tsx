import { useState, useMemo } from "react";
import { Check, Search, User, X, ChevronDown, ChevronUp, AlertCircle, Mail, Users, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Contact } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface RecipientSelectionValue {
  selectedContactIds: string[];
  manualEmails: string[];
  cc: string;
  bcc: string;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface RecipientSelectorProps {
  value: RecipientSelectionValue;
  onChange: (val: RecipientSelectionValue) => void;
  allowMultiple?: boolean;
  compact?: boolean;
  label?: string;
}

export function RecipientSelector({
  value,
  onChange,
  allowMultiple = true,
  compact = false,
  label = "Select Recipients",
}: RecipientSelectorProps) {
  const { contacts } = useStore();
  const [search, setSearch] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(Boolean(value.cc || value.bcc));
  const [activeTab, setActiveTab] = useState<"contacts" | "manual">("contacts");

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts.items;
    return contacts.items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [contacts.items, search]);

  const toggleContact = (id: string) => {
    if (!allowMultiple) {
      onChange({ ...value, selectedContactIds: [id] });
      return;
    }
    const current = new Set(value.selectedContactIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    onChange({ ...value, selectedContactIds: Array.from(current) });
  };

  const handleSelectAllFiltered = () => {
    if (!allowMultiple) return;
    const allFilteredIds = filteredContacts.map((c) => c._id);
    const current = new Set(value.selectedContactIds);
    const allSelected = allFilteredIds.every((id) => current.has(id));

    if (allSelected) {
      // Unselect filtered
      allFilteredIds.forEach((id) => current.delete(id));
    } else {
      // Select all filtered
      allFilteredIds.forEach((id) => current.add(id));
    }
    onChange({ ...value, selectedContactIds: Array.from(current) });
  };

  const handleAddManualEmail = () => {
    const raw = manualInput.trim();
    if (!raw) return;

    // Support comma or space separated emails
    const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
    const newValidEmails: string[] = [];

    for (const t of tokens) {
      if (validateEmail(t) && !value.manualEmails.includes(t)) {
        newValidEmails.push(t);
      }
    }

    if (newValidEmails.length > 0) {
      if (!allowMultiple) {
        onChange({ ...value, manualEmails: [newValidEmails[0]!] });
      } else {
        onChange({ ...value, manualEmails: [...value.manualEmails, ...newValidEmails] });
      }
      setManualInput("");
    }
  };

  const removeManualEmail = (emailToRemove: string) => {
    onChange({
      ...value,
      manualEmails: value.manualEmails.filter((e) => e !== emailToRemove),
    });
  };

  const removeContactId = (idToRemove: string) => {
    onChange({
      ...value,
      selectedContactIds: value.selectedContactIds.filter((id) => id !== idToRemove),
    });
  };

  const selectedContactsCount = value.selectedContactIds.length;
  const manualCount = value.manualEmails.length;
  const totalCount = selectedContactsCount + manualCount;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-primary" />
            {label}
          </Label>
          <Badge variant={totalCount > 0 ? "default" : "outline"} className="text-[10px] h-5 px-1.5">
            {totalCount} selected
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => setShowCcBcc(!showCcBcc)}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showCcBcc ? "Hide CC/BCC" : "+ CC / BCC"}
        </button>
      </div>

      {/* Recipient Source Tabs: Saved Contacts vs Manual Email */}
      <div className="flex gap-1 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("contacts")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "contacts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Saved Contacts ({contacts.items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "manual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Manual Entry
        </button>
      </div>

      {/* Tab 1: Saved Contacts */}
      {activeTab === "contacts" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/50"
              />
            </div>

            {allowMultiple && filteredContacts.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="h-8 text-[11px] shrink-0"
              >
                {filteredContacts.every((c) => value.selectedContactIds.includes(c._id))
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            )}
          </div>

          {filteredContacts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No contacts found matching "{search}". Switch to "Manual Entry" to type an email.
            </p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-border/20 pr-1">
              {filteredContacts.map((c) => {
                const isChecked = value.selectedContactIds.includes(c._id);
                return (
                  <div
                    key={c._id}
                    onClick={() => toggleContact(c._id)}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked ? "bg-primary/10 text-foreground font-medium" : "hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleContact(c._id)}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      <span className="truncate">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground truncate">({c.email})</span>
                    </div>
                    {c.company && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground shrink-0 ml-1">
                        {c.company}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Manual Email Input */}
      {activeTab === "manual" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address (e.g. client@company.com)..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddManualEmail();
                }
              }}
              className="h-8 text-xs bg-background/50 flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddManualEmail}
              disabled={!manualInput.trim()}
              className="h-8 text-xs shrink-0 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Type any valid email address and click Add or press Enter. You can add multiple recipients.
          </p>
        </div>
      )}

      {/* Selected Recipients Preview Chips */}
      {totalCount > 0 && (
        <div className="pt-2 border-t border-border/40 space-y-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            Selected Recipients ({totalCount}):
          </span>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {value.selectedContactIds.map((id) => {
              const c = contacts.items.find((x) => x._id === id);
              if (!c) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20"
                >
                  <User className="h-3 w-3" />
                  {c.name || c.email}
                  <button
                    type="button"
                    onClick={() => removeContactId(id)}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {value.manualEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 text-[11px] bg-accent/60 text-foreground px-2 py-0.5 rounded-md border border-border"
              >
                <Mail className="h-3 w-3 text-muted-foreground" />
                {email}
                <button
                  type="button"
                  onClick={() => removeManualEmail(email)}
                  className="hover:text-destructive transition-colors ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Optional CC & BCC Fields */}
      {showCcBcc && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40 animate-in fade-in-50">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">CC (Carbon Copy)</Label>
            <Input
              type="text"
              placeholder="e.g. manager@company.com"
              value={value.cc}
              onChange={(e) => onChange({ ...value, cc: e.target.value })}
              className="h-8 text-xs bg-background/50"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">BCC (Blind Carbon Copy)</Label>
            <Input
              type="text"
              placeholder="e.g. archive@company.com"
              value={value.bcc}
              onChange={(e) => onChange({ ...value, bcc: e.target.value })}
              className="h-8 text-xs bg-background/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Confirmation Dialog for any email sending action across the app
export interface SendConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSending?: boolean;
  title?: string;
  subject: string;
  recipientsCount: number;
  recipientSummary: string[];
  cc?: string;
  bcc?: string;
  deliveryMode?: string;
}

export function SendConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isSending = false,
  title = "Confirm Email Dispatch",
  subject,
  recipientsCount,
  recipientSummary,
  cc,
  bcc,
  deliveryMode = "Immediate Dispatch",
}: SendConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/80">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-primary pb-1">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            Please verify the exact recipients and subject line before confirming send. Emails will ONLY be delivered to the verified list below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2.5 py-2 text-xs">
          <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
            <div className="flex justify-between items-center py-0.5 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Recipient Count:</span>
              <Badge variant="default" className="text-[10px] h-5">
                {recipientsCount} recipient(s)
              </Badge>
            </div>

            <div className="py-1 border-b border-border/30">
              <span className="text-muted-foreground font-medium block mb-1">To:</span>
              <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
                {recipientSummary.slice(0, 10).map((r, i) => (
                  <div key={i} className="text-foreground font-mono text-[11px] truncate">
                    • {r}
                  </div>
                ))}
                {recipientSummary.length > 10 && (
                  <div className="text-muted-foreground text-[10px] italic">
                    + {recipientSummary.length - 10} more recipient(s)
                  </div>
                )}
              </div>
            </div>

            {cc && (
              <div className="flex justify-between items-center py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">CC:</span>
                <span className="font-mono text-foreground text-[11px] truncate max-w-[200px]">
                  {cc}
                </span>
              </div>
            )}

            {bcc && (
              <div className="flex justify-between items-center py-0.5 border-b border-border/30">
                <span className="text-muted-foreground font-medium">BCC:</span>
                <span className="font-mono text-foreground text-[11px] truncate max-w-[200px]">
                  {bcc}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-0.5 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Subject:</span>
              <span className="font-medium text-foreground truncate max-w-[220px]">
                {subject}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-muted-foreground font-medium">Delivery Mode:</span>
              <span className="text-muted-foreground">{deliveryMode}</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSending || recipientsCount === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            {isSending ? "Dispatching..." : "Confirm & Send"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

