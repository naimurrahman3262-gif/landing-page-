"use client";

import { MessageCircle, Ticket } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticle } from "@/lib/api/queries/account";
import { useFormatDate } from "@/lib/format-context";
import { useUiStore } from "@/lib/stores/ui";

/** One help article, with a way out to a human at the end. */
export function ArticleView({ slug }: { slug: string }) {
  const t = useTranslations("help");
  const fmt = useFormatDate();
  const q = useArticle(slug);
  const openChat = useUiStore((s) => s.setChatOpen);

  if (q.isPending) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (q.isError)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("articleError")} backHref="/help" />
        <ErrorState title={t("articleError")} onRetry={() => q.refetch()} retrying={q.isFetching} />
      </div>
    );

  const a = q.data;
  return (
    <article className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title={a.title}
        subtitle={`${a.category} · ${t("updated", { date: fmt(a.updatedAt, "date") })}`}
        backHref="/help"
      />
      <div className="grid gap-4 leading-relaxed text-text-2">
        {a.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <Card className="grid gap-3">
        <CardTitle>{t("wasHelpful")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Link href="/help/tickets?new=1" className={buttonVariants({ variant: "outline" })}>
            <Ticket aria-hidden /> {t("newTicket")}
          </Link>
          <Button variant="outline" onClick={() => openChat(true)}>
            <MessageCircle aria-hidden /> {t("chat")}
          </Button>
        </div>
      </Card>
    </article>
  );
}
