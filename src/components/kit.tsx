import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/api";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  );
}

export function GlassCard({ className, children, delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-glow", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const statusStyle: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-primary-glow/15 text-primary-glow",
  sending: "bg-primary/15 text-primary",
  sent: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  failed: "bg-destructive/15 text-destructive",
};
export function StatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyle[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", status === "sending" && "animate-pulse")} />
      {status}
    </span>
  );
}

export const tooltipStyle = {
  background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12,
};
