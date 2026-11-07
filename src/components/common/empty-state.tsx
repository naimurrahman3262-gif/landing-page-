import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** "Nothing here yet" with the next useful action. G16: always a real icon. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-content-center rounded-full bg-surface-2 text-text-2">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="font-display text-base font-bold text-text-1">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-2">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
