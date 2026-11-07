"use client";

import { ChevronRight, LifeBuoy, Mail, MessageCircle, Phone, Search, Ticket } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LEGAL } from "@/config/legal";
import { useArticles, useTickets } from "@/lib/api/queries/account";
import type { Article } from "@/lib/api/schemas";
import { useUiStore } from "@/lib/stores/ui";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";

/** Help centre (brief §6.11): greeting, search, popular articles, topics, contact. */
export function HelpView() {
  const t = useTranslations("help");
  const tt = useTranslations("tickets");
  const user = useUser();
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [category, setCategory] = useQueryState("category", parseAsString);
  const [draft, setDraft] = useState(q);
  const all = useArticles();
  const results = useArticles(q, category ?? undefined);
  const openChat = useUiStore((s) => s.setChatOpen);
  const tickets = useTickets("all", "");
  const filtering = !!q || !!category;
  const categories = [...new Set((all.data ?? []).map((a) => a.category))];
  const waiting = tickets.data?.filter((x) => x.status === "awaitingReply").length ?? 0;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8">
      <PageHeader title={t("greeting", { name: user.firstName })} />

      <form
        role="search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          void setQ(draft.trim() || null);
        }}
        className="relative -mt-4"
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-3"
        />
        <Input
          type="search"
          name="q"
          aria-label={t("search")}
          placeholder={t("search")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          size={1}
          className="h-12 w-full pr-28 pl-11"
        />
        <Button type="submit" size="sm" className="absolute top-1/2 right-1.5 -translate-y-1/2">
          {t("searchButton")}
        </Button>
      </form>

      {categories.length > 0 && (
        <section aria-labelledby="help-topics" className="grid gap-3">
          <h2 id="help-topics" className="font-display text-lg font-bold">
            {t("categories")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => void setCategory(category === c ? null : c)}
                className={cn(
                  "h-10 rounded-full border px-4 font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
                  category === c
                    ? "border-primary-border bg-primary-soft text-primary-text"
                    : "border-border-strong text-text-2 hover:bg-surface-2",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="help-articles" className="grid gap-3" aria-live="polite">
        <h2 id="help-articles" className="font-display text-lg font-bold">
          {filtering && results.data
            ? t("results", { count: results.data.length, q: q || category || "" })
            : t("popular")}
        </h2>
        {(filtering ? results : all).isPending && <Skeleton className="h-48" />}
        {(filtering ? results : all).isError && (
          <ErrorState title={t("articleError")} onRetry={() => (filtering ? results : all).refetch()} />
        )}
        {filtering && results.data?.length === 0 && (
          <EmptyState
            icon={LifeBuoy}
            title={t("results", { count: 0, q: q || category || "" })}
            description={t("newTicketBody")}
          />
        )}
        <ArticleList articles={(filtering ? results.data : all.data?.filter((a) => a.popular)) ?? []} />
      </section>

      <section aria-labelledby="help-contact" className="grid gap-3">
        <h2 id="help-contact" className="font-display text-lg font-bold">
          {t("quick")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ContactCard
            icon={Ticket}
            title={t("newTicket")}
            body={t("newTicketBody")}
            href="/help/tickets?new=1"
          />
          <button
            type="button"
            onClick={() => openChat(true)}
            className="rounded-lg text-left focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            <ContactBody icon={MessageCircle} title={t("chat")} body={t("chatBody")} />
          </button>
          {LEGAL.supportPhone && (
            <ContactCard
              icon={Phone}
              title={t("call")}
              body={LEGAL.supportPhone}
              href={`tel:${LEGAL.supportPhone.replace(/\s/g, "")}`}
            />
          )}
          {LEGAL.supportEmail && (
            <ContactCard
              icon={Mail}
              title={t("email")}
              body={LEGAL.supportEmail}
              href={`mailto:${LEGAL.supportEmail}`}
            />
          )}
        </div>
        <Link href="/help/tickets" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
          {t("myTickets")}
          {waiting > 0 && (
            <span className="rounded-full bg-warning-soft px-2 text-xs text-warning-text">
              {tt("tabs.awaitingReply")}: {waiting}
            </span>
          )}
        </Link>
      </section>
    </div>
  );
}

function ArticleList({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <ul className="grid divide-y divide-border rounded-lg border border-border bg-surface-1">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link
            href={`/help/articles/${a.slug}` as never}
            className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
          >
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="font-medium">{a.title}</span>
              <span className="text-sm text-text-3">{a.summary}</span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-text-3" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ContactBody({ icon: Icon, title, body }: { icon: typeof Ticket; title: string; body: string }) {
  return (
    <Card padding="sm" className="grid h-full gap-2 transition-colors hover:bg-surface-2">
      <Icon aria-hidden className="size-5 text-text-2" />
      <CardTitle className="text-base">{title}</CardTitle>
      <p className="text-sm break-words text-text-3">{body}</p>
    </Card>
  );
}

function ContactCard({ href, ...props }: { icon: typeof Ticket; title: string; body: string; href: string }) {
  const internal = href.startsWith("/");
  const className = "rounded-lg focus-visible:outline-2 focus-visible:outline-focus-ring";
  return internal ? (
    <Link href={href as never} className={className}>
      <ContactBody {...props} />
    </Link>
  ) : (
    <a href={href} className={className}>
      <ContactBody {...props} />
    </a>
  );
}
