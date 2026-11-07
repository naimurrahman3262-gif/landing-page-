"use client";

import { ChevronRight, Inbox, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTickets } from "@/lib/api/queries/account";
import { useFormatDate } from "@/lib/format-context";
import { NewTicketDialog } from "./new-ticket-dialog";

const TABS = ["all", "open", "awaitingReply", "closed"] as const;

/** Tickets (brief §6.11): status tabs only, search, real data or an empty state. */
export function TicketsView() {
  const t = useTranslations("tickets");
  const fmt = useFormatDate();
  const router = useRouter();
  const [state, setState] = useQueryStates({
    status: parseAsStringLiteral(TABS).withDefault("all"),
    q: parseAsString.withDefault(""),
    new: parseAsBoolean.withDefault(false),
    tx: parseAsString,
    category: parseAsString,
  });
  const [draft, setDraft] = useState(state.q);
  const q = useTickets(state.status, state.q);

  // Debounced search into the URL.
  useEffect(() => {
    const id = setTimeout(() => {
      if (draft.trim() !== state.q) void setState({ q: draft.trim() || null });
    }, 300);
    return () => clearTimeout(id);
  }, [draft, state.q, setState]);

  const closeDialog = () => void setState({ new: null, tx: null, category: null });

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        backHref="/help"
        actions={
          <Button onClick={() => void setState({ new: true })}>
            <Plus aria-hidden /> {t("new")}
          </Button>
        }
      />

      <div className="grid gap-3 md:flex md:items-center md:justify-between">
        <Tabs
          value={state.status}
          onValueChange={(v) => void setState({ status: v as (typeof TABS)[number] })}
        >
          <TabsList className="max-w-full overflow-x-auto">
            {TABS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {t(`tabs.${s}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative md:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-3"
          />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            size={1}
            className="w-full pl-9"
          />
        </div>
      </div>

      {q.isPending && <Skeleton className="h-60" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data?.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={t(`empty.${state.status}`)}
          description={t("emptyBody")}
          action={<Button onClick={() => void setState({ new: true })}>{t("new")}</Button>}
        />
      )}
      {q.data && q.data.length > 0 && (
        <ul className="grid divide-y divide-border rounded-lg border border-border bg-surface-1">
          {q.data.map((tk) => (
            <li key={tk.id}>
              <Link
                href={`/help/tickets/${tk.id}` as never}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
              >
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{tk.subject}</span>
                  </span>
                  <span className="text-sm text-text-3">
                    {t("number", { number: tk.number })} · {t(`categories.${tk.category}`)} ·{" "}
                    {t("updated", { when: fmt(tk.updatedAt, "relative") })}
                  </span>
                </span>
                <StatusBadge status={tk.status} label={t(`tabs.${tk.status}`)} />
                <ChevronRight aria-hidden className="size-4 shrink-0 text-text-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewTicketDialog
        open={state.new}
        onOpenChange={(o) => (o ? void setState({ new: true }) : closeDialog())}
        prefill={{ tx: state.tx, category: state.category }}
        onCreated={(tk) => router.push(`/help/tickets/${tk.id}` as never)}
      />
    </div>
  );
}
