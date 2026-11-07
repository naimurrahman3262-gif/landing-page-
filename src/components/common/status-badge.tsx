import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleMinus,
  CircleX,
  Clock,
  Eye,
  LoaderCircle,
  Lock,
  MessageCircleReply,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The single status vocabulary for the whole portal. Every status has an icon
 * and a text label as well as a colour (colour is never the only signal).
 */
export const STATUSES = {
  // money movements
  pending: { tone: "warning", icon: Clock },
  processing: { tone: "info", icon: LoaderCircle },
  approved: { tone: "success", icon: CircleCheck },
  rejected: { tone: "danger", icon: CircleX },
  failed: { tone: "danger", icon: CircleX },
  cancelled: { tone: "neutral", icon: CircleMinus },
  // trading accounts
  active: { tone: "success", icon: CircleDot },
  inactive: { tone: "neutral", icon: CircleDashed },
  disabled: { tone: "danger", icon: Ban },
  readOnly: { tone: "warning", icon: Eye },
  // KYC documents & payment methods
  verified: { tone: "success", icon: CircleCheck },
  expired: { tone: "danger", icon: TimerOff },
  locked: { tone: "neutral", icon: Lock },
  // campaigns
  live: { tone: "success", icon: CircleDot },
  ended: { tone: "neutral", icon: CircleMinus },
  // support tickets
  open: { tone: "info", icon: CircleDot },
  awaitingReply: { tone: "warning", icon: MessageCircleReply },
  closed: { tone: "neutral", icon: CircleMinus },
} as const satisfies Record<string, { tone: Tone; icon: LucideIcon }>;

type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export type Status = keyof typeof STATUSES;

const toneClasses: Record<Tone, string> = {
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger-text",
  info: "bg-info-soft text-info-text",
  neutral: "bg-neutral-soft text-text-2",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const t = useTranslations("status");
  const { tone, icon: Icon } = STATUSES[status];
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 font-display text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(status)}
    </span>
  );
}
