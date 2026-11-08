"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Mail, Send, Share2, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useMemo } from "react";
import { CopyButton } from "@/components/common/copy-button";
import { DataTable, type DataColumnMeta } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { StatusBadge, type Status } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralProgram } from "@/lib/api/queries/insights";
import { FUNNEL_STAGES, type Referral, type ReferralProgram } from "@/lib/api/schemas";
import { formatMoney, formatNumber } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { shareLinks } from "@/lib/referrals";
import { cn } from "@/lib/utils";

/** One status model, mapped onto the shared badge tones. */
const BADGE: Record<Referral["status"], Status> = {
  registered: "pending",
  kycApproved: "processing",
  webinar: "processing",
  eligible: "approved",
  rewarded: "verified",
  expired: "expired",
};

/** Referrals (brief §6.8): hero, how it works, funnel, earnings, table, campaign. */
export function ReferralsView() {
  const t = useTranslations("referrals");
  const q = useReferralProgram();
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {q.isPending && <Skeleton className="h-96" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && <Program p={q.data} />}
    </div>
  );
}

function Program({ p }: { p: ReferralProgram }) {
  const t = useTranslations("referrals");
  const money = (n: number) => formatMoney(n, p.currency);
  return (
    <>
      <Hero p={p} />
      <section aria-labelledby="ref-how" className="grid gap-3">
        <h2 id="ref-how" className="font-display text-lg font-bold">
          {t("how")}
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            [t("step1"), t("step1Body", { friend: money(p.rewards.friend) })],
            [
              t("step2"),
              t("step2Body", { deposit: money(p.rewards.minDeposit), lots: formatNumber(p.rewards.minLots) }),
            ],
            [t("step3"), t("step3Body", { referrer: money(p.rewards.referrer) })],
          ].map(([title, body], i) => (
            <li key={title}>
              <Card padding="sm" className="grid h-full gap-2">
                <span className="grid size-8 place-content-center rounded-full bg-primary-soft font-display font-bold text-primary-text">
                  {i + 1}
                </span>
                <span className="font-medium">{title}</span>
                <span className="text-sm text-text-2">{body}</span>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label={t("earned")} value={money(p.earnings.total)} syncedAt={p.syncedAt} />
        <StatTile label={t("pending")} value={money(p.earnings.pending)} syncedAt={p.syncedAt} />
      </div>

      <Funnel funnel={p.funnel} />
      {p.campaign && <CampaignCard campaign={p.campaign} />}
      <ReferralTable p={p} />
    </>
  );
}

function Hero({ p }: { p: ReferralProgram }) {
  const t = useTranslations("referrals");
  const links = shareLinks(p.link, t("shareText"));
  const nets = [
    ["whatsapp", links.whatsapp, Share2],
    ["telegram", links.telegram, Send],
    ["x", links.x, Share2],
    ["email", links.email, Mail],
  ] as const;
  return (
    <Card className="grid gap-6 md:grid-cols-3">
      <div className="grid content-start gap-4 md:col-span-2">
        <div className="grid gap-2">
          <span className="text-sm font-medium" id="ref-link-label">
            {t("yourLink")}
          </span>
          <div className="flex items-center gap-2 rounded-md bg-surface-2 py-1 pr-1 pl-3">
            <code aria-labelledby="ref-link-label" className="min-w-0 flex-1 truncate font-mono text-sm">
              {p.link}
            </code>
            <CopyButton value={p.link} label={t("yourLink")} variant="primary" showText />
          </div>
          <span className="text-sm text-text-3">{t("code", { code: p.code })}</span>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t("share")}</span>
          <ul className="flex flex-wrap gap-2">
            {nets.map(([id, href, Icon]) => (
              <li key={id}>
                <a
                  href={href}
                  target={id === "email" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={t("shareOn", { network: t(`networks.${id}`) })}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Icon aria-hidden /> {t(`networks.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid justify-items-center gap-2 md:justify-items-end">
        <div className="rounded-lg bg-qr-bg p-3">
          <QRCodeSVG
            value={p.link}
            size={144}
            role="img"
            aria-label={t("qrAlt")}
            bgColor="transparent"
            fgColor="currentColor"
            className="text-qr-ink"
          />
        </div>
      </div>
    </Card>
  );
}

/** Clicks → … → Rewarded. Each bar is relative to clicks; counts are text, not just length. */
function Funnel({ funnel }: { funnel: ReferralProgram["funnel"] }) {
  const t = useTranslations("referrals");
  const top = Math.max(funnel.clicks, 1);
  return (
    <Card className="grid gap-4">
      <CardTitle>{t("funnel")}</CardTitle>
      <ol className="grid gap-3">
        {FUNNEL_STAGES.map((s) => {
          const value = funnel[s];
          const pct = Math.round((value / top) * 100);
          return (
            <li key={s} className="grid gap-1 sm:grid-cols-4 sm:items-center sm:gap-3">
              <span className="flex justify-between text-sm sm:block">
                <span>{t(`funnelStages.${s}`)}</span>
                <span className="font-medium tabular sm:hidden">{formatNumber(value)}</span>
              </span>
              <div className="h-3 overflow-hidden rounded-full bg-surface-3 sm:col-span-2" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${value ? Math.max(pct, 2) : 0}%` }}
                />
              </div>
              <span className="sr-only">{formatNumber(value)}</span>
              <span
                aria-hidden
                className="hidden text-right text-sm font-medium tabular sm:col-start-4 sm:row-start-1 sm:block"
              >
                {formatNumber(value)}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function CampaignCard({ campaign: c }: { campaign: NonNullable<ReferralProgram["campaign"]> }) {
  const t = useTranslations("referrals");
  const fmt = useFormatDate();
  const ended = !!c.endedAt;
  return (
    <Card className={cn("flex flex-wrap items-start gap-4", ended && "bg-surface-1/60")}>
      <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
        <Trophy aria-hidden className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <span className="text-sm text-text-3">{t("campaign")}</span>
        <span className="font-medium">{c.name}</span>
        <span className="text-sm text-text-2">{c.summary}</span>
      </div>
      <StatusBadge
        status={ended ? "ended" : "live"}
        label={
          ended
            ? t("campaignEnded", { date: fmt(c.endedAt!, "date") })
            : t("campaignLive", { date: fmt(c.endsAt, "date") })
        }
      />
    </Card>
  );
}

function ReferralTable({ p }: { p: ReferralProgram }) {
  const t = useTranslations("referrals");
  const fmt = useFormatDate();
  const columns = useMemo<ColumnDef<Referral, unknown>[]>(
    () => [
      { id: "name", header: t("name"), accessorKey: "name" },
      {
        id: "joined",
        header: t("joined"),
        accessorFn: (r) => r.joinedAt,
        cell: ({ row }) => <time dateTime={row.original.joinedAt}>{fmt(row.original.joinedAt, "date")}</time>,
      },
      {
        id: "status",
        header: t("status"),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge status={BADGE[row.original.status]} label={t(`statuses.${row.original.status}`)} />
        ),
      },
      {
        id: "next",
        header: t("nextStep"),
        enableSorting: false,
        cell: ({ row }) =>
          t(`next.${row.original.status}`, {
            deposit: formatMoney(p.rewards.minDeposit, p.currency),
            lots: formatNumber(p.rewards.minLots),
          }),
      },
      {
        id: "reward",
        header: t("reward"),
        enableSorting: false,
        meta: { numeric: true } satisfies DataColumnMeta,
        cell: ({ row }) =>
          row.original.reward === null ? "—" : formatMoney(row.original.reward, p.currency),
      },
    ],
    [t, fmt, p.rewards, p.currency],
  );
  return (
    <section aria-labelledby="ref-table" className="grid gap-3">
      <h2 id="ref-table" className="font-display text-lg font-bold">
        {t("table")}
      </h2>
      <DataTable
        data={p.referrals}
        columns={columns}
        caption={t("table")}
        getRowId={(r) => r.id}
        initialSorting={[{ id: "joined", desc: true }]}
        empty={<EmptyState icon={Users} title={t("empty")} description={t("emptyBody")} />}
      />
    </section>
  );
}
