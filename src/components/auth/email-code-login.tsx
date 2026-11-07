"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/common/field";
import { OtpInput } from "@/components/common/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { EmailCodeStartInput } from "@/lib/api/schemas";
import { useApiErrorMessage, useCountdown, useValidationMessage } from "@/lib/hooks";
import { AuthHeading, FormAlert } from "./auth-card";
import { useAuthRedirect, type AuthStep } from "./login-form";

type Sent = { sentTo: string; resendInSeconds: number };

export function EmailCodeLogin({ next }: { next: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const redirect = useAuthRedirect();
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const timer = useCountdown(0);

  const form = useForm({ resolver: zodResolver(EmailCodeStartInput), defaultValues: { email: "" } });

  async function send(values: { email: string }) {
    setError(undefined);
    try {
      const res = await apiFetch<Sent>("/auth/email-code/start", { body: values });
      setSent(res);
      timer.restart(res.resendInSeconds);
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  async function verify(value = code) {
    if (value.length !== 6) return setError(vt("codeInvalid"));
    setError(undefined);
    setVerifying(true);
    try {
      redirect(
        await apiFetch<AuthStep>(`/auth/email-code/verify?next=${encodeURIComponent(next)}`, {
          body: { code: value },
        }),
      );
    } catch (e) {
      setError(apiError(e).message);
      setCode("");
      setVerifying(false);
    }
  }

  if (!sent) {
    return (
      <>
        <AuthHeading title={t("emailCode.heading")} subtitle={t("emailCode.body")} />
        <FormAlert>{error}</FormAlert>
        <form noValidate onSubmit={form.handleSubmit(send)} className="grid gap-4">
          <Field id="ec-email" label={t("login.email")} error={vt(form.formState.errors.email?.message)}>
            {(a) => <Input type="email" autoComplete="email" autoFocus {...a} {...form.register("email")} />}
          </Field>
          <Button type="submit" block loading={form.formState.isSubmitting}>
            {t("emailCode.send")}
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <AuthHeading title={t("emailCode.heading")} subtitle={t("emailCode.sentTo", { email: sent.sentTo })} />
      <FormAlert>{error}</FormAlert>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="grid gap-4"
      >
        <OtpInput
          aria-label={t("emailCode.code")}
          value={code}
          onChange={setCode}
          onComplete={verify}
          invalid={!!error}
          autoFocus
        />
        <Button type="submit" block loading={verifying}>
          {t("emailCode.submit")}
        </Button>
        <Button
          type="button"
          variant="link"
          disabled={timer.seconds > 0}
          onClick={() => send(form.getValues())}
          className="justify-self-center"
        >
          {timer.seconds > 0 ? tc("resendIn", { seconds: timer.seconds }) : tc("resend")}
        </Button>
      </form>
    </>
  );
}
