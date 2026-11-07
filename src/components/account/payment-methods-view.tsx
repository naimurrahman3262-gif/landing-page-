"use client";

import { Bitcoin, Landmark, MoreHorizontal, Plus, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { StepUpAuthDialog } from "@/components/common/step-up-auth-dialog";
import { PayoutMethodSheet } from "@/components/funds/payout-method-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemovePayoutMethod, useUpdatePayoutMethod } from "@/lib/api/queries/account";
import { usePayoutMethods } from "@/lib/api/queries/funds";
import type { PayoutMethod } from "@/lib/api/schemas";
import { useApiErrorMessage } from "@/lib/hooks";

/** Payment methods (brief §6.10): one list, default badge, status, add/rename/remove. */
export function PaymentMethodsView() {
  const t = useTranslations("paymentMethods");
  const q = usePayoutMethods();
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {t("add")}
          </Button>
        }
      />
      <p className="flex items-center gap-2 rounded-md bg-surface-1 p-3 text-sm text-text-2">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-text-3" />
        {t("ownership")}
      </p>
      {q.isPending && <Skeleton className="h-60" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && q.data.length === 0 && (
        <EmptyState
          icon={Landmark}
          title={t("empty")}
          description={t("emptyBody")}
          action={<Button onClick={() => setAdding(true)}>{t("add")}</Button>}
        />
      )}
      {q.data && q.data.length > 0 && (
        <ul className="grid gap-3">
          {q.data.map((m) => (
            <MethodRow key={m.id} method={m} />
          ))}
        </ul>
      )}
      <PayoutMethodSheet open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function MethodRow({ method: m }: { method: PayoutMethod }) {
  const t = useTranslations("paymentMethods");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const apiError = useApiErrorMessage();
  const update = useUpdatePayoutMethod();
  const remove = useRemovePayoutMethod();
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(m.label);
  const [renameError, setRenameError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const Icon = m.type === "bank" ? Landmark : Bitcoin;

  async function makeDefault() {
    try {
      await update.mutateAsync({ id: m.id, isDefault: true });
      toast.success(t("renamed"));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return setRenameError(tv("labelRequired"));
    try {
      await update.mutateAsync({ id: m.id, label: label.trim() });
      setRenaming(false);
      toast.success(t("renamed"));
    } catch (err) {
      setRenameError(apiError(err).message);
    }
  }

  async function onVerified(token: string) {
    try {
      await remove.mutateAsync({ id: m.id, stepUpToken: token });
      toast.success(t("removed"));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  return (
    <li>
      <Card padding="sm" className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {m.label}
            {m.isDefault && (
              <span className="rounded-full bg-primary-soft px-2 text-xs font-medium text-primary-text">
                {t("default")}
              </span>
            )}
          </span>
          <span className="text-sm text-text-3 tabular">
            {m.masked}
            {m.holderName && ` · ${m.holderName}`}
          </span>
          {m.status === "rejected" && m.rejectionReason && (
            <span className="text-sm text-danger-text">
              {t("rejectedReason", { reason: m.rejectionReason })}
            </span>
          )}
          {m.status === "pending" && <span className="text-sm text-text-3">{t("pendingNote")}</span>}
        </div>
        <StatusBadge status={m.status} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`${tc("moreActions")}: ${m.label}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!m.isDefault && m.status === "verified" && (
              <DropdownMenuItem onSelect={() => void makeDefault()}>{t("makeDefault")}</DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                setLabel(m.label);
                setRenameError(undefined);
                setRenaming(true);
              }}
            >
              {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-danger-text" onSelect={() => setConfirm(true)}>
              {t("remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <form method="post" noValidate onSubmit={rename}>
            <DialogHeader>
              <DialogTitle>{t("rename")}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Field id={`rename-${m.id}`} label={t("label")} error={renameError}>
                {(a) => (
                  <Input {...a} value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
                )}
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" loading={update.isPending}>
                {tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="danger"
        title={t("removeTitle", { name: m.label })}
        description={t("removeBody")}
        confirmLabel={t("remove")}
        pending={remove.isPending}
        onConfirm={() => {
          setConfirm(false);
          setStepUp(true);
        }}
      />
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("removeAction")}
        onVerified={onVerified}
      />
    </li>
  );
}
