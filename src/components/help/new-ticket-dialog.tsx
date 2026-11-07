"use client";

import { Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTicket } from "@/lib/api/queries/account";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useTransaction, useTransactions } from "@/lib/api/queries/funds";
import { NewTicketInput, TicketCategory, type Ticket } from "@/lib/api/schemas";
import { formatAccountId, formatMoney } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";

const NONE = "none";
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

export interface NewTicketPrefill {
  category?: string | null;
  tx?: string | null;
}

/**
 * New ticket (brief §6.11): category, account, transaction, subject, description,
 * attachments. Prefilled from a transaction ("Contact support" on a receipt).
 */
export function NewTicketDialog({
  open,
  onOpenChange,
  prefill,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: NewTicketPrefill;
  onCreated: (ticket: Ticket) => void;
}) {
  const t = useTranslations("tickets");
  const tf = useTranslations("tickets.form");
  const ttx = useTranslations("transactions");
  const tc = useTranslations("common");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const fmt = useFormatDate();
  const create = useCreateTicket();
  const accounts = useAccounts();
  const recent = useTransactions({
    from: null,
    to: null,
    type: [],
    status: [],
    account: null,
    q: "",
    page: 1,
    pageSize: 20,
  });
  const prefTx = useTransaction(prefill.tx ?? undefined);

  const [category, setCategory] = useState<string>("");
  const [login, setLogin] = useState<string>(NONE);
  const [txId, setTxId] = useState<string>(NONE);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  // Reset on every opening, then apply the prefill.
  useEffect(() => {
    if (!open) return;
    const cat = TicketCategory.safeParse(prefill.category);
    setCategory(cat.success ? cat.data : "");
    setLogin(NONE);
    setTxId(prefill.tx ?? NONE);
    setSubject("");
    setDescription("");
    setFiles([]);
    setErrors({});
    setFormError(undefined);
  }, [open, prefill.category, prefill.tx]);

  // When the linked transaction loads, fill in category, account and subject.
  const linked = prefTx.data;
  useEffect(() => {
    if (!open || !linked) return;
    setCategory((c) => c || (linked.type === "transfer" ? "account" : linked.type));
    if (linked.account.kind === "mt5") setLogin(String(linked.account.login));
    setSubject((s) => s || `${ttx(`types.${linked.type}`)} ${linked.reference}`);
  }, [open, linked, ttx]);

  const dz = useDropzone({
    multiple: true,
    maxSize: MAX_SIZE,
    noClick: true,
    onDrop: (accepted, rejected) => {
      const next = [...files, ...accepted.map((f) => ({ name: f.name, size: f.size }))].slice(0, MAX_FILES);
      setFiles(next);
      setErrors((e) => ({ ...e, attachments: rejected.length ? (vt("fileTooLarge") ?? "") : "" }));
    },
  });

  const txOptions = [...(recent.data?.items ?? [])];
  if (linked && !txOptions.some((x) => x.id === linked.id)) txOptions.unshift(linked);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const input = {
      category,
      login: login === NONE ? null : Number(login),
      transactionId: txId === NONE ? null : txId,
      subject,
      description,
      attachments: files,
    };
    const parsed = NewTicketInput.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]);
        next[k] ??= k === "category" ? "categoryRequired" : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      const ticket = await create.mutateAsync(parsed.data);
      toast.success(tf("created", { number: ticket.number }));
      onCreated(ticket);
    } catch (err) {
      setFormError(apiError(err).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form method="post" noValidate onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{tf("title")}</DialogTitle>
            <DialogDescription>{tf("body")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <FormAlert>{formError}</FormAlert>
            {linked && (
              <p role="status" className="rounded-md bg-info-soft p-3 text-sm text-info-text">
                {tf("prefilled", { reference: linked.reference })}
              </p>
            )}
            <Field id="nt-category" label={tf("category")} required error={vt(errors.category)}>
              {(a) => (
                <Select value={category || undefined} onValueChange={setCategory}>
                  <SelectTrigger {...a}>
                    <SelectValue placeholder={tf("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TicketCategory.options.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="nt-account" label={tf("account")}>
                {(a) => (
                  <Select value={login} onValueChange={setLogin}>
                    <SelectTrigger {...a}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{tf("none")}</SelectItem>
                      {(accounts.data?.items ?? [])
                        .filter((acc) => !acc.archived)
                        .map((acc) => (
                          <SelectItem key={acc.login} value={String(acc.login)}>
                            {formatAccountId(acc.login)}
                            {acc.label ? ` · ${acc.label}` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field id="nt-tx" label={tf("transaction")}>
                {(a) => (
                  <Select value={txId} onValueChange={setTxId}>
                    <SelectTrigger {...a}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value={NONE}>{tf("none")}</SelectItem>
                      {txOptions.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {ttx(`types.${x.type}`)} · {formatMoney(x.amount, x.currency)} ·{" "}
                          {fmt(x.createdAt, "date")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
            <Field id="nt-subject" label={tf("subject")} required error={vt(errors.subject)}>
              {(a) => (
                <Input {...a} value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
              )}
            </Field>
            <Field
              id="nt-description"
              label={tf("description")}
              required
              hint={tf("descriptionHint")}
              error={vt(errors.description)}
            >
              {(a) => (
                <textarea
                  {...a}
                  rows={5}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-border-strong bg-surface-1 px-3 py-2 text-base placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-focus-ring aria-invalid:border-danger"
                />
              )}
            </Field>
            <div className="grid gap-2">
              <span className="text-sm font-medium">{tf("attachments")}</span>
              <div
                {...dz.getRootProps()}
                className="grid justify-items-center gap-2 rounded-md border-2 border-dashed border-border-strong p-4 text-center text-sm text-text-2"
              >
                <input {...dz.getInputProps()} aria-label={tf("attachments")} />
                <p>{tf("dropzone")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={dz.open}
                  disabled={files.length >= MAX_FILES}
                >
                  <Paperclip aria-hidden /> {t("detail.attach")}
                </Button>
              </div>
              {errors.attachments && <p className="text-sm text-danger-text">{errors.attachments}</p>}
              {files.length > 0 && (
                <AttachmentList files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {tf("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AttachmentList({
  files,
  onRemove,
}: {
  files: { name: string; size: number }[];
  onRemove?: (index: number) => void;
}) {
  const tf = useTranslations("tickets.form");
  return (
    <ul className="grid gap-1">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-1.5 text-sm"
        >
          <Paperclip aria-hidden className="size-4 shrink-0 text-text-3" />
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="shrink-0 text-text-3 tabular">{Math.max(1, Math.round(f.size / 1024))} KB</span>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={tf("remove", { name: f.name })}
              onClick={() => onRemove(i)}
            >
              <X aria-hidden />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
