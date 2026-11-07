"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  BellOff,
  IdCard,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { NotificationList, type Notification } from "@/lib/api/schemas";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<Notification["kind"], LucideIcon> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  kyc: IdCard,
  ticket: LifeBuoy,
  campaign: Megaphone,
  security: ShieldCheck,
};

const KEY = ["notifications"] as const;

/** G18: deposit/withdrawal status, KYC, ticket replies, campaign expiry. */
export function NotificationBell() {
  const t = useTranslations();
  const fmt = useFormatDate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => NotificationList.parse(await apiFetch("/notifications")),
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: async () => NotificationList.parse(await apiFetch("/notifications/read", { body: {} })),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });

  const unread = query.data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread ? t("shell.notificationsUnread", { count: unread }) : t("shell.notifications")}
          className="relative"
        >
          <Bell aria-hidden className="size-5!" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute top-2 right-2 grid min-w-4.5 place-content-center rounded-full bg-primary px-1 font-display text-2xs leading-4.5 font-bold text-on-primary"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-display font-bold">{t("shell.notifications")}</h2>
          {unread > 0 && (
            <Button variant="link" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              {t("shell.markAllRead")}
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.isPending && (
            <div className="grid gap-4 p-4" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}
          {query.isError && (
            <ErrorState
              compact
              className="m-3"
              title={t("shell.notificationsError")}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          )}
          {query.data && query.data.items.length === 0 && (
            <EmptyState
              icon={BellOff}
              className="m-3 border-none"
              title={t("shell.notificationsEmpty")}
              description={t("shell.notificationsEmptyBody")}
            />
          )}
          {query.data && query.data.items.length > 0 && (
            <ul className="divide-y divide-border">
              {query.data.items.map((n) => {
                const Icon = KIND_ICON[n.kind];
                const content = (
                  <>
                    <span className="mt-0.5 grid size-8 shrink-0 place-content-center rounded-full bg-surface-3 text-text-2">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className={cn("text-sm", n.read ? "text-text-2" : "font-medium text-text-1")}>
                          {n.title}
                        </span>
                        {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                      </span>
                      <span className="text-sm text-text-2">{n.body}</span>
                      <span className="text-xs text-text-3">
                        {t(`notificationsKinds.${n.kind}`)} ·{" "}
                        <time dateTime={n.createdAt}>{fmt(n.createdAt, "relative")}</time>
                      </span>
                    </span>
                  </>
                );
                const cls =
                  "flex gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring";
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href as never} onClick={() => setOpen(false)} className={cls}>
                        {content}
                      </Link>
                    ) : (
                      <div className={cls}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
