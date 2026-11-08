import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { request, endpoints } from "@/lib/api";
import { ShieldCheck, Mail, Send, CheckCircle2, Server, Key, Sparkles, RefreshCw } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [provider, setProvider] = useState<"brevo" | "smtp" | "ethereal">("ethereal");
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [smtp, setSmtp] = useState({
    host: "",
    port: 587,
    user: "",
    pass: "",
    secure: false,
  });
  const [fromName, setFromName] = useState("SendFlow Studio");
  const [fromEmail, setFromEmail] = useState("notifications@sendflow.app");
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTestMail, setSendingTestMail] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await request<any>(endpoints.settings);
      if (data) {
        if (data.provider) setProvider(data.provider);
        if (data.brevoApiKey) setBrevoApiKey(data.brevoApiKey);
        if (data.fromName) setFromName(data.fromName);
        if (data.fromEmail) setFromEmail(data.fromEmail);
        if (data.smtp) {
          setSmtp({
            host: data.smtp.host || "",
            port: data.smtp.port || 587,
            user: data.smtp.user || "",
            pass: data.smtp.pass || "",
            secure: Boolean(data.smtp.secure),
          });
        }
      }
    } catch {
      // In local mode
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await request(endpoints.settings, {
        method: "PUT",
        body: JSON.stringify({
          provider,
          brevoApiKey,
          smtp,
          fromName,
          fromEmail,
        }),
      });
      toast.success("Settings saved successfully!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestSuccess(null);
    try {
      const res = await request<{ success: boolean; message: string }>(`${endpoints.settings}/test-connection`, {
        method: "POST",
        body: JSON.stringify({ provider, brevoApiKey, smtp }),
      });
      setTestSuccess(res.message);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || "Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestMail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid test recipient email");
      return;
    }
    setSendingTestMail(true);
    try {
      const res = await request<{ message: string; previewUrl?: string }>(`${endpoints.settings}/test-email`, {
        method: "POST",
        body: JSON.stringify({ to: testEmail }),
      });
      toast.success(res.message);
      if (res.previewUrl) {
        window.open(res.previewUrl, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setSendingTestMail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Server className="h-5 w-5 text-primary" />
            Email Delivery & Provider Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Active Delivery Engine</Label>
            <RadioGroup
              value={provider}
              onValueChange={(val: any) => setProvider(val)}
              className="grid grid-cols-3 gap-3"
            >
              <label
                className={`flex flex-col items-center justify-between rounded-xl border p-3 cursor-pointer text-center transition-all ${
                  provider === "ethereal"
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <RadioGroupItem value="ethereal" className="sr-only" />
                <Sparkles className="h-5 w-5 mb-1 text-primary" />
                <div className="font-semibold text-xs">Test Sandbox</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Ethereal / Zero-config</div>
              </label>

              <label
                className={`flex flex-col items-center justify-between rounded-xl border p-3 cursor-pointer text-center transition-all ${
                  provider === "brevo"
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <RadioGroupItem value="brevo" className="sr-only" />
                <Key className="h-5 w-5 mb-1 text-primary" />
                <div className="font-semibold text-xs">Brevo API</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Sendinblue v3 API</div>
              </label>

              <label
                className={`flex flex-col items-center justify-between rounded-xl border p-3 cursor-pointer text-center transition-all ${
                  provider === "smtp"
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <RadioGroupItem value="smtp" className="sr-only" />
                <Mail className="h-5 w-5 mb-1 text-primary" />
                <div className="font-semibold text-xs">Custom SMTP</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Nodemailer SMTP</div>
              </label>
            </RadioGroup>
          </div>

          {/* Brevo Config */}
          {provider === "brevo" && (
            <div className="rounded-xl border bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Key className="h-4 w-4 text-primary" />
                Brevo (Sendinblue) Credentials
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brevoKey">API Key (v3)</Label>
                <Input
                  id="brevoKey"
                  type="password"
                  placeholder="xkeysib-..."
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find your v3 API key in your Brevo Dashboard → SMTP & API.
                </p>
              </div>
            </div>
          )}

          {/* SMTP Config */}
          {provider === "smtp" && (
            <div className="rounded-xl border bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" />
                SMTP Host & Authentication
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 grid gap-1.5">
                  <Label>SMTP Host</Label>
                  <Input
                    placeholder="smtp-relay.brevo.com"
                    value={smtp.host}
                    onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value, 10) || 587 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Username</Label>
                  <Input
                    placeholder="user@example.com"
                    value={smtp.user}
                    onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="16-character App Password"
                    value={smtp.pass}
                    onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">💡 Gmail Quick Setup:</span> Host: <code className="text-primary font-mono">smtp.gmail.com</code>, Port: <code className="text-primary font-mono">587</code>. In Password, paste your 16-character code from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary underline font-medium">Google App Passwords</a>.
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="secureSmtp" className="text-xs cursor-pointer">
                  Require SSL/TLS (port 465)
                </Label>
                <Switch
                  id="secureSmtp"
                  checked={smtp.secure}
                  onCheckedChange={(val) => setSmtp({ ...smtp, secure: val })}
                />
              </div>
            </div>
          )}

          {/* Sender Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>From Name</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="SendFlow Studio"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>From Email Address</Label>
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="notifications@sendflow.app"
              />
            </div>
          </div>

          {/* Connection Test & Test Send */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-success" />
                Live Verification
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Verify Handshake
              </Button>
            </div>

            {testSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-success/15 px-3 py-2 text-xs text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{testSuccess}</span>
              </div>
            )}

            <div className="pt-2 border-t">
              <Label className="text-xs">Send Real Test Email to Recipient</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleSendTestMail}
                  disabled={sendingTestMail}
                  className="bg-gradient-brand shrink-0"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send Test
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-brand shadow-glow">
            Save Provider Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

