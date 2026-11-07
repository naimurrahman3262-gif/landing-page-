"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Laptop, Mail, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert } from "@/components/auth/auth-card";
import { CopyButton } from "@/components/common/copy-button";
import { ErrorState } from "@/components/common/error-state";
import { Field } from "@/components/common/field";
import { OtpInput } from "@/components/common/otp-input";
import { PageHeader } from "@/components/common/page-header";
import { PasswordField } from "@/components/common/password-field";
import { StatusBadge } from "@/components/common/status-badge";
import { StepUpAuthDialog } from "@/components/common/step-up-auth-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChangeEmail,
  useChangePassword,
  useDisableTwoFactor,
  useEnableTwoFactor,
  useRevokeSession,
  useSecurity,
  useTwoFactorSetup,
} from "@/lib/api/queries/account";
import { ChangePasswordInput, type SecurityOverview } from "@/lib/api/schemas";
import { useFormatDate } from "@/lib/format-context";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";
import { useUser } from "@/lib/user-context";

/** Security (brief §6.10): 2FA, password, email, signed-in devices, login history. */
export function SecurityView() {
  const t = useTranslations("security");
  const q = useSecurity();
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {q.isPending && <Skeleton className="h-96" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && (
        <>
          <TwoFactorCard data={q.data} />
          <PasswordCard changedAt={q.data.passwordChangedAt} />
          <EmailCard />
          <SessionsCard sessions={q.data.sessions} />
          <HistoryCard events={q.data.loginHistory} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- 2FA --------------------------------- */

function TwoFactorCard({ data }: { data: SecurityOverview }) {
  const t = useTranslations("security");
  const apiError = useApiErrorMessage();
  const disable = useDisableTwoFactor();
  const [setupOpen, setSetupOpen] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const on = data.twoFactorEnabled;

  async function onVerified(token: string) {
    try {
      await disable.mutateAsync(token);
      toast.success(t("disabled"));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
        {on ? <ShieldCheck aria-hidden className="size-5" /> : <ShieldOff aria-hidden className="size-5" />}
      </span>
      <div className="grid flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{t("twoFactor")}</CardTitle>
          <StatusBadge status={on ? "active" : "inactive"} label={on ? t("on") : t("off")} />
        </div>
        <p className="text-sm text-text-2">{on ? t("twoFactorOnBody") : t("twoFactorOffBody")}</p>
        {on && <p className="text-sm text-text-3">{t("backupLeft", { count: data.backupCodesRemaining })}</p>}
      </div>
      {on ? (
        <Button variant="outline" loading={disable.isPending} onClick={() => setStepUp(true)}>
          {t("turnOff")}
        </Button>
      ) : (
        <Button onClick={() => setSetupOpen(true)}>{t("turnOn")}</Button>
      )}
      <TwoFactorSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("disableAction")}
        onVerified={onVerified}
      />
    </Card>
  );
}

function TwoFactorSetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("security");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const setup = useTwoFactorSetup();
  const enable = useEnableTwoFactor();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [backup, setBackup] = useState<string[] | null>(null);

  // Fresh secret for every opening.
  useEffect(() => {
    if (!open) return;
    setCode("");
    setError(undefined);
    setBackup(null);
    setup.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [open]);
  const change = onOpenChange;

  async function submit(value = code) {
    if (value.length !== 6) return;
    setError(undefined);
    try {
      const res = await enable.mutateAsync(value);
      setBackup(res.backupCodes);
      toast.success(t("enabled"));
    } catch (e) {
      setError(apiError(e).message);
      setCode("");
    }
  }

  function download(codes: string[]) {
    const url = URL.createObjectURL(
      new Blob([`WinproFX backup codes\n\n${codes.join("\n")}\n`], { type: "text/plain" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "winprofx-backup-codes.txt",
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent>
        {backup ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("backupTitle")}</DialogTitle>
              <DialogDescription>{t("backupBody")}</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <ul className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-4 font-mono text-sm tabular">
                {backup.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={backup.join("\n")} label={t("backupCopy")} variant="outline" showText />
                <Button variant="outline" onClick={() => download(backup)}>
                  {t("backupDownload")}
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => change(false)}>{t("backupDone")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("setupTitle")}</DialogTitle>
              <DialogDescription>{t("setupScan")}</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <div className="grid justify-items-center gap-3">
                {setup.data ? (
                  <div className="rounded-lg bg-qr-bg p-3">
                    <QRCodeSVG
                      value={setup.data.otpauthUrl}
                      size={168}
                      role="img"
                      aria-label={t("setupQrAlt")}
                      bgColor="transparent"
                      fgColor="currentColor"
                      className="text-qr-ink"
                    />
                  </div>
                ) : setup.isError ? (
                  <FormAlert>{apiError(setup.error).message}</FormAlert>
                ) : (
                  <Skeleton className="size-48" />
                )}
              </div>
              {setup.data && (
                <div className="grid gap-1 text-sm">
                  <span className="text-text-2">{t("setupManual")}</span>
                  <span className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
                    <code className="min-w-0 font-mono break-all">{setup.data.secret}</code>
                    <CopyButton value={setup.data.secret} label={t("setupManual")} />
                  </span>
                </div>
              )}
              <p className="text-sm text-text-2">{t("setupCode")}</p>
              <FormAlert>{error}</FormAlert>
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={(v) => void submit(v)}
                invalid={!!error}
                aria-label={t("setupCode")}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => change(false)}>
                {tc("cancel")}
              </Button>
              <Button loading={enable.isPending} disabled={code.length !== 6} onClick={() => void submit()}>
                {t("setupSubmit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- password ------------------------------- */

function PasswordCard({ changedAt }: { changedAt: string | null }) {
  const t = useTranslations("security");
  const tc = useTranslations("common");
  const fmt = useFormatDate();
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const change = useChangePassword();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof ChangePasswordInput>>({
    resolver: zodResolver(ChangePasswordInput),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const { errors } = form.formState;

  async function onSubmit(v: z.infer<typeof ChangePasswordInput>) {
    try {
      await change.mutateAsync(v);
      form.reset();
      setOpen(false);
      toast.success(t("passwordDone"));
    } catch (e) {
      const { message, fields } = apiError(e);
      if (fields.current) form.setError("current", { message: fields.current });
      else form.setError("root", { message });
    }
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
          <KeyRound aria-hidden className="size-5" />
        </span>
        <div className="grid flex-1 gap-1">
          <CardTitle>{t("password")}</CardTitle>
          <p className="text-sm text-text-2">
            {changedAt ? t("passwordChanged", { date: fmt(changedAt, "date") }) : t("passwordNever")}
          </p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            {t("changePassword")}
          </Button>
        )}
      </div>
      {open && (
        <form
          method="post"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 sm:max-w-md"
        >
          <FormAlert>{errors.root?.message}</FormAlert>
          <Field id="pw-current" label={t("current")} error={vt(errors.current?.message)}>
            {(a) => (
              <Controller
                control={form.control}
                name="current"
                render={({ field }) => <PasswordField autoComplete="current-password" {...a} {...field} />}
              />
            )}
          </Field>
          <Field id="pw-new" label={t("newPassword")} error={vt(errors.password?.message)}>
            {(a) => (
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <PasswordField autoComplete="new-password" showRules {...a} {...field} />
                )}
              />
            )}
          </Field>
          <Field id="pw-confirm" label={t("confirm")} error={vt(errors.confirm?.message)}>
            {(a) => (
              <Controller
                control={form.control}
                name="confirm"
                render={({ field }) => <PasswordField autoComplete="new-password" {...a} {...field} />}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={change.isPending}>
              {t("changePassword")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset();
                setOpen(false);
              }}
            >
              {tc("cancel")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* --------------------------------- email -------------------------------- */

function EmailCard() {
  const t = useTranslations("security");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const user = useUser();
  const apiError = useApiErrorMessage();
  const change = useChangeEmail();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [stepUp, setStepUp] = useState(false);
  const [pending, setPending] = useState<string>();

  function start(e: React.FormEvent) {
    e.preventDefault();
    const ok = z.string().email().safeParse(email.trim()).success;
    if (!ok) return setError(tv("emailInvalid"));
    if (email.trim().toLowerCase() === user.email.toLowerCase()) return setError(tv("emailSame"));
    setError(undefined);
    setStepUp(true);
  }

  async function onVerified(token: string) {
    try {
      const res = await change.mutateAsync({ email: email.trim(), stepUpToken: token });
      setPending(res.pendingEmail);
      setOpen(false);
      setEmail("");
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 text-text-2">
          <Mail aria-hidden className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <CardTitle>{t("email")}</CardTitle>
          <p className="text-sm break-all text-text-2">{t("emailCurrent", { email: user.email })}</p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            {t("changeEmail")}
          </Button>
        )}
      </div>
      {pending && (
        <p role="status" className="rounded-md bg-info-soft p-3 text-sm text-info-text">
          {t("emailPending", { email: pending })}
        </p>
      )}
      {open && (
        <form method="post" noValidate onSubmit={start} className="grid gap-4 sm:max-w-md">
          <Field id="email-new" label={t("newEmail")} error={error}>
            {(a) => (
              <Input
                {...a}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={change.isPending}>
              {t("emailSubmit")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setError(undefined);
              }}
            >
              {tc("cancel")}
            </Button>
          </div>
        </form>
      )}
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("emailAction")}
        onVerified={onVerified}
      />
    </Card>
  );
}

/* ------------------------------- sessions ------------------------------- */

function SessionsCard({ sessions }: { sessions: SecurityOverview["sessions"] }) {
  const t = useTranslations("security");
  const fmt = useFormatDate();
  const apiError = useApiErrorMessage();
  const revoke = useRevokeSession();
  const others = sessions.filter((s) => !s.current);

  async function run(id: string) {
    try {
      await revoke.mutateAsync(id);
      toast.success(t("signedOut"));
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("sessions")}</CardTitle>
        {others.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={revoke.isPending && revoke.variables === "others"}
            onClick={() => run("others")}
          >
            {t("signOutOthers")}
          </Button>
        )}
      </div>
      <ul className="grid divide-y divide-border">
        {sessions.map((s) => {
          const Icon = /iphone|android|ios|mobile/i.test(s.device) ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Icon aria-hidden className="size-5 shrink-0 text-text-3" />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-medium">
                  {s.device}
                  {s.current && (
                    <span className="ml-2 text-sm font-normal text-success-text">{t("thisDevice")}</span>
                  )}
                </span>
                <span className="text-sm text-text-3">
                  {s.location} · {t("lastActive", { when: fmt(s.lastActiveAt, "relative") })}
                </span>
              </div>
              {!s.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={revoke.isPending && revoke.variables === s.id}
                  onClick={() => run(s.id)}
                  aria-label={`${t("signOutDevice")}: ${s.device}`}
                >
                  {t("signOutDevice")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function HistoryCard({ events }: { events: SecurityOverview["loginHistory"] }) {
  const t = useTranslations("security");
  const fmt = useFormatDate();
  return (
    <Card className="grid gap-4">
      <CardTitle>{t("history")}</CardTitle>
      <ul className="grid divide-y divide-border">
        {events.map((e) => (
          <li
            key={e.at}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
          >
            <div className="grid min-w-0 gap-0.5">
              <span className="text-sm font-medium">{e.device}</span>
              <span className="text-sm text-text-3">
                {e.location} · {fmt(e.at, "datetime")}
              </span>
            </div>
            <StatusBadge
              status={e.result === "success" ? "approved" : "failed"}
              label={t(`results.${e.result}`)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
