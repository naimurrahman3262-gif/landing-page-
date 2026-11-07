"use client";

import { Paperclip } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloseTicket, useReplyTicket, useTicket } from "@/lib/api/queries/account";
import { TicketReplyInput, type Ticket } from "@/lib/api/schemas";
import { formatAccountId } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./new-ticket-dialog";

/** Ticket detail (brief §6.11): thread, reply with attachments, close. */
export function TicketDetailView({ id }: { id: string }) {
  const t = useTranslations("tickets");
  const q = useTicket(id);

  if (q.isPending) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (q.isError)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("title")} backHref="/help/tickets" />
        <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />
      </div>
    );
  return <Thread ticket={q.data} />;
}

function Thread({ ticket: tk }: { ticket: Ticket }) {
  const t = useTranslations("tickets");
  const td = useTranslations("tickets.detail");
  const fmt = useFormatDate();
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const reply = useReplyTicket(tk.id);
  const close = useCloseTicket(tk.id);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [closeError, setCloseError] = useState<string>();
  const closed = tk.status === "closed";

  const dz = useDropzone({
    multiple: true,
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    noDrag: closed,
    onDrop: (accepted, rejected) => {
      setFiles((f) => [...f, ...accepted.map((x) => ({ name: x.name, size: x.size }))].slice(0, 5));
      setError(rejected.length ? vt("fileTooLarge") : undefined);
    },
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const parsed = TicketReplyInput.safeParse({ body, attachments: files });
    if (!parsed.success) return setError(vt(parsed.error.issues[0]?.message));
    setError(undefined);
    try {
      await reply.mutateAsync(parsed.data);
      setBody("");
      setFiles([]);
      toast.success(td("sent"));
    } catch (err) {
      setError(apiError(err).message);
    }
  }

  async function doClose() {
    setCloseError(undefined);
    try {
      await close.mutateAsync();
      setConfirm(false);
    } catch (err) {
      setCloseError(apiError(err).message);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title={tk.subject}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {t("number", { number: tk.number })} · {t(`categories.${tk.category}`)}
            <StatusBadge status={tk.status} label={t(`tabs.${tk.status}`)} />
          </span>
        }
        backHref="/help/tickets"
        actions={
          !closed && (
            <Button variant="outline" onClick={() => setConfirm(true)}>
              {td("close")}
            </Button>
          )
        }
      />

      {(tk.login || tk.transactionId) && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {tk.login && (
            <div className="flex gap-1">
              <dt className="text-text-3">{td("account")}:</dt>
              <dd>{formatAccountId(tk.login)}</dd>
            </div>
          )}
          {tk.transactionId && (
            <div className="flex gap-1">
              <dt className="text-text-3">{td("transaction")}:</dt>
              <dd>
                <Link
                  href={`/funds/transactions?tx=${tk.transactionId}` as never}
                  className="text-primary-text underline-offset-4 hover:underline"
                >
                  {tk.transactionId}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      )}

      <ol className="grid gap-4" aria-label={tk.subject}>
        {tk.messages.map((m) => (
          <li key={m.id} className={cn("grid gap-1", m.author === "client" ? "sm:pl-12" : "sm:pr-12")}>
            <Card
              padding="sm"
              className={cn("grid gap-2", m.author === "client" ? "bg-surface-2" : "bg-surface-1")}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{m.authorName}</span>
                <time dateTime={m.at} className="text-text-3">
                  {fmt(m.at, "datetime")}
                </time>
              </div>
              <p className="text-sm whitespace-pre-line text-text-2">{m.body}</p>
              {m.attachments.length > 0 && <AttachmentList files={m.attachments} />}
            </Card>
          </li>
        ))}
      </ol>

      {closed ? (
        <Card className="grid gap-3 text-center">
          <p className="font-medium">{td("closed")}</p>
          <p className="text-sm text-text-2">{td("closedBody")}</p>
          <Link
            href={`/help/tickets?new=1&category=${tk.category}` as never}
            className={cn(buttonVariants({ variant: "outline" }), "justify-self-center")}
          >
            {t("new")}
          </Link>
        </Card>
      ) : (
        <form method="post" noValidate onSubmit={send} className="grid gap-3" {...dz.getRootProps()}>
          <input {...dz.getInputProps()} aria-label={td("attach")} />
          <label htmlFor="ticket-reply" className="font-display font-bold">
            {td("reply")}
          </label>
          <FormAlert>{error}</FormAlert>
          <textarea
            id="ticket-reply"
            rows={4}
            maxLength={5000}
            value={body}
            placeholder={td("replyPlaceholder")}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={!!error || undefined}
            className="w-full rounded-md border border-border-strong bg-surface-1 px-3 py-2 text-base placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-focus-ring aria-invalid:border-danger"
          />
          {files.length > 0 && (
            <AttachmentList files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="ghost" onClick={dz.open} disabled={files.length >= 5}>
              <Paperclip aria-hidden /> {td("attach")}
            </Button>
            <Button type="submit" loading={reply.isPending}>
              {td("send")}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={td("closeTitle")}
        description={td("closeBody")}
        confirmLabel={td("close")}
        onConfirm={() => void doClose()}
        pending={close.isPending}
        error={closeError}
      />
    </div>
  );
}
