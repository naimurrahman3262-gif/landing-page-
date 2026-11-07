import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Right-aligned on desktop, full-width row under the title on mobile. */
  actions?: ReactNode;
  backHref?: string;
  className?: string;
}

/** G13: the one page header used on every page. */
export function PageHeader({ title, subtitle, actions, backHref, className }: PageHeaderProps) {
  const t = useTranslations("common");
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {backHref && (
          <Link
            href={backHref as never}
            aria-label={t("back")}
            className="-ml-2 grid size-11 shrink-0 place-content-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </Link>
        )}
        <div className="min-w-0 pt-1.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-1 md:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-text-2">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
    </header>
  );
}
