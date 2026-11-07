"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Field } from "@/components/common/field";
import { OtpInput } from "@/components/common/otp-input";
import { PasswordField } from "@/components/common/password-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api/client";
import { ChangeEmailInput, ForgotPasswordInput, ResetPasswordInput } from "@/lib/api/schemas";
import { useApiErrorMessage, useCountdown, useValidationMessage } from "@/lib/hooks";
import { AuthHeading, FormAlert } from "./auth-card";
import { useAuthRedirect, type AuthStep } from "./login-form";

/* ------------------------------- shared ------------------------------- */

function useCodeSubmit(path: string, next?: string) {
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const redirect = useAuthRedirect();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(extra: Record<string, unknown> = {}, value = code) {
    if (value.length !== 6) return setError(vt("codeInvalid"));
    setError(undefined);
    setPending(true);
    try {
      const q = next ? `?next=${encodeURIComponent(next)}` : "";
      redirect(await apiFetch<AuthStep>(`${path}${q}`, { body: { code: value, ...extra } }));
    } catch (e) {
      setError(apiError(e).message);
      setCode("");
      setPending(false);
    }
  }
  return { code, setCode, error, setError, pending, submit };
}

/* ---------------------------- verify email ---------------------------- */

export function VerifyEmailForm({ email: initialEmail }: { email: string | null }) {
  const t = useTranslations("auth.verifyEmail");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const [email, setEmail] = useState(initialEmail);
  const [notice, setNotice] = useState<string>();
  const [changeOpen, setChangeOpen] = useState(false);
  const { seconds, restart } = useCountdown(60);
  const c = useCodeSubmit("/auth/verify-email");

  async function resend() {
    c.setError(undefined);
    try {
      const res = await apiFetch<{ resendInSeconds: number }>("/auth/verify-email/resend", {
        method: "POST",
      });
      restart(res.resendInSeconds);
      setNotice(t("resent"));
    } catch (e) {
      c.setError(apiError(e).message);
    }
  }

  return (
    <>
      <AuthHeading title={t("heading")} subtitle={email ? t("body", { email }) : t("bodyNoEmail")} />
      {notice && !c.error && <FormAlert tone="success">{notice}</FormAlert>}
      <FormAlert>{c.error}</FormAlert>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void c.submit();
        }}
        className="grid gap-4"
      >
        <OtpInput
          aria-label={t("code")}
          value={c.code}
          onChange={c.setCode}
          onComplete={(v) => c.submit({}, v)}
          invalid={!!c.error}
          autoFocus
        />
        <Button type="submit" block loading={c.pending}>
          {t("submit")}
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="link" disabled={seconds > 0} onClick={resend}>
          {seconds > 0 ? tc("resendIn", { seconds }) : tc("resend")}
        </Button>
        <Button variant="link" onClick={() => setChangeOpen(true)}>
          {t("changeEmail")}
        </Button>
      </div>
      <ChangeEmailDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        onChanged={(next, resendIn) => {
          setEmail(next);
          restart(resendIn);
          setNotice(t("changed"));
        }}
      />
    </>
  );
}

function ChangeEmailDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (email: string, resendIn: number) => void;
}) {
  const t = useTranslations("auth.verifyEmail");
  const tc = useTranslations("common");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const [error, setError] = useState<string>();
  const form = useForm({ resolver: zodResolver(ChangeEmailInput), defaultValues: { email: "" } });

  async function onSubmit(values: { email: string }) {
    setError(undefined);
    try {
      const res = await apiFetch<{ resendInSeconds: number }>("/auth/change-email", { body: values });
      onChanged(values.email, res.resendInSeconds);
      onOpenChange(false);
      form.reset();
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{t("changeTitle")}</DialogTitle>
            <DialogDescription>{t("changeBody")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FormAlert>{error}</FormAlert>
            <Field id="change-email" label={t("newEmail")} error={vt(form.formState.errors.email?.message)}>
              {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("changeSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- 2FA -------------------------------- */

export function TwoFactorForm({ next }: { next: string }) {
  const t = useTranslations("auth.twoFactor");
  const tc = useTranslations("common");
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const [method, setMethod] = useState<"totp" | "email">("totp");
  const [sentTo, setSentTo] = useState<string>();
  const [trust, setTrust] = useState(false);
  const { seconds, restart } = useCountdown(0);
  const c = useCodeSubmit("/auth/2fa", next);

  async function sendEmailCode() {
    c.setError(undefined);
    try {
      const res = await apiFetch<{ sentTo: string; resendInSeconds: number }>("/auth/2fa/email-code", {
        method: "POST",
      });
      setSentTo(res.sentTo);
      setMethod("email");
      restart(res.resendInSeconds);
    } catch (e) {
      c.setError(apiError(e).message);
    }
  }

  async function signOut() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <AuthHeading
        title={t("heading")}
        subtitle={method === "email" && sentTo ? t("bodyEmail", { email: sentTo }) : t("bodyTotp")}
      />
      <FormAlert>{c.error}</FormAlert>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void c.submit({ method, trustDevice: trust });
        }}
        className="grid gap-4"
      >
        <OtpInput
          aria-label={t("code")}
          value={c.code}
          onChange={c.setCode}
          onComplete={(v) => c.submit({ method, trustDevice: trust }, v)}
          invalid={!!c.error}
          autoFocus
        />
        <div className="flex items-center gap-3">
          <Checkbox id="trust-device" checked={trust} onCheckedChange={(v) => setTrust(v === true)} />
          <Label htmlFor="trust-device" className="font-normal text-text-2">
            {t("trust")}
          </Label>
        </div>
        <Button type="submit" block loading={c.pending}>
          {t("submit")}
        </Button>
      </form>
      <div className="mt-4 grid justify-items-start gap-1">
        {method === "totp" ? (
          <Button variant="link" onClick={sendEmailCode}>
            {t("useEmail")}
          </Button>
        ) : (
          <>
            <Button variant="link" disabled={seconds > 0} onClick={sendEmailCode}>
              {seconds > 0 ? tc("resendIn", { seconds }) : tc("resend")}
            </Button>
            <Button variant="link" onClick={() => setMethod("totp")}>
              {t("useTotp")}
            </Button>
          </>
        )}
        <Button variant="link" className="text-text-2" onClick={signOut}>
          {t("signOut")}
        </Button>
      </div>
    </>
  );
}

/* --------------------------- forgot / reset --------------------------- */

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const form = useForm({ resolver: zodResolver(ForgotPasswordInput), defaultValues: { email: "" } });

  async function onSubmit(values: { email: string }) {
    setError(undefined);
    try {
      await apiFetch("/auth/password/forgot", { body: values });
      router.push("/reset-password");
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  return (
    <>
      <AuthHeading title={t("heading")} subtitle={t("body")} />
      <FormAlert>{error}</FormAlert>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <Field id="forgot-email" label={t("email")} error={vt(form.formState.errors.email?.message)}>
          {(a) => <Input type="email" autoComplete="email" autoFocus {...a} {...form.register("email")} />}
        </Field>
        <Button type="submit" block loading={form.formState.isSubmitting}>
          {t("submit")}
        </Button>
      </form>
      <Link href="/login" className={buttonVariants({ variant: "link", className: "mt-4" })}>
        {t("backToLogin")}
      </Link>
    </>
  );
}

type ResetValues = z.input<typeof ResetPasswordInput>;

export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const [error, setError] = useState<{ message: string; expired: boolean }>();
  const [done, setDone] = useState(false);
  const form = useForm<ResetValues>({
    resolver: zodResolver(ResetPasswordInput),
    defaultValues: { code: "", password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ResetValues) {
    setError(undefined);
    try {
      await apiFetch("/auth/password/reset", { body: values });
      setDone(true);
    } catch (e) {
      const { message } = apiError(e);
      setError({ message, expired: e instanceof Error && "code" in e && e.code === "FLOW_EXPIRED" });
    }
  }

  if (done) {
    return (
      <div className="grid justify-items-center gap-3 text-center">
        <CircleCheck aria-hidden className="size-10 text-success" />
        <AuthHeading title={t("successTitle")} subtitle={t("successBody")} />
        <Link href="/login" className={buttonVariants({ block: true })}>
          {t("toLogin")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={t("heading")} subtitle={t("body")} />
      {error && (
        <FormAlert>
          {error.message}{" "}
          {error.expired && (
            <Link href="/forgot-password" className="font-medium underline underline-offset-4">
              {t("startAgain")}
            </Link>
          )}
        </FormAlert>
      )}
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <Field id="reset-code" label={t("code")} error={vt(errors.code?.message)}>
          {(a) => (
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => (
                <OtpInput
                  id={a.id}
                  aria-describedby={a["aria-describedby"]}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.code}
                  autoFocus
                />
              )}
            />
          )}
        </Field>
        <Field id="reset-password" label={t("password")} error={vt(errors.password?.message)}>
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
        <Field id="reset-confirm" label={t("confirm")} error={vt(errors.confirm?.message)}>
          {(a) => (
            <Controller
              control={form.control}
              name="confirm"
              render={({ field }) => <PasswordField autoComplete="new-password" {...a} {...field} />}
            />
          )}
        </Field>
        <Button type="submit" block loading={isSubmitting}>
          {t("submit")}
        </Button>
      </form>
    </>
  );
}
