import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Auth card. Width is min(440px, 100% − 32px) via max-w-110 + the layout's
 * 16px gutters, so it never collapses at any width 320–1920 (old bug).
 */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-110 rounded-xl border border-border bg-surface-1 p-6 shadow-2 sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6 grid gap-2">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-1">{title}</h1>
      {subtitle && <p className="text-sm text-text-2">{subtitle}</p>}
    </div>
  );
}

/** Form-level message (server errors, success notes). Icon + text, announced politely. */
export function FormAlert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "info";
  children: ReactNode;
}) {
  if (!children) return null;
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "mb-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm",
        tone === "danger" && "bg-danger-soft text-danger-text",
        tone === "success" && "bg-success-soft text-success-text",
        tone === "info" && "bg-info-soft text-info-text",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-text-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border" />
      <span aria-hidden>{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
