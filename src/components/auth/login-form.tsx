"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronDown, Mail, QrCode, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Field } from "@/components/common/field";
import { PasswordField } from "@/components/common/password-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/config/brand";
import { apiFetch } from "@/lib/api/client";
import { LoginInput } from "@/lib/api/schemas";
import { useApiErrorMessage, useHash, useValidationMessage } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { AuthHeading, Divider, FormAlert } from "./auth-card";
import { EmailCodeLogin } from "./email-code-login";
import { GoogleIcon } from "./google-icon";
import { QrLogin } from "./qr-login";

export type AuthStep = { step: "2fa" | "verify-email" | "done"; next: string };

/** Route after any successful sign-in step. */
export function useAuthRedirect() {
  const router = useRouter();
  return (res: AuthStep) => {
    const q = res.next !== "/" ? `?next=${encodeURIComponent(res.next)}` : "";
    if (res.step === "2fa") router.push(`/2fa${q}` as never);
    else if (res.step === "verify-email") router.push("/verify-email");
    else {
      router.replace(res.next as never);
      router.refresh();
    }
  };
}

const MODES = ["email-code", "qr", "telegram"] as const;
type Mode = (typeof MODES)[number];

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [hash, setHash] = useHash();
  const mode = (MODES as readonly string[]).includes(hash) ? (hash as Mode) : null;
  const nextQ = `?next=${encodeURIComponent(next)}`;

  if (mode) {
    return (
      <>
        <button
          type="button"
          onClick={() => history.back()}
          className="mb-4 -ml-1 inline-flex h-11 items-center gap-2 rounded-md px-1 text-sm text-text-2 hover:text-text-1 focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          <ArrowLeft aria-hidden className="size-4" /> {t("login.back")}
        </button>
        {mode === "email-code" && <EmailCodeLogin next={next} />}
        {mode === "qr" && <QrLogin next={next} />}
        {mode === "telegram" && (
          <>
            <AuthHeading title={t("telegram.heading")} subtitle={t("telegram.body")} />
            <a href={`/api/auth/oauth/telegram${nextQ}`} className={buttonVariants({ block: true })}>
              <Send aria-hidden /> {t("telegram.submit")}
            </a>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <AuthHeading title={t("login.heading", { brand: BRAND })} subtitle={t("login.subtitle")} />
      {notice && <FormAlert tone="info">{notice}</FormAlert>}
      <PasswordLogin next={next} />

      <Divider label={tc("or")} />
      <a
        href={`/api/auth/oauth/google${nextQ}`}
        className={buttonVariants({ variant: "outline", block: true })}
      >
        <GoogleIcon /> {t("login.google")}
      </a>

      <details className="group mt-3">
        <summary
          className={cn(
            buttonVariants({ variant: "ghost", block: true }),
            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          )}
        >
          {t("login.moreWays")}
          <ChevronDown aria-hidden className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 grid gap-2">
          <Button variant="outline" block onClick={() => setHash("email-code")}>
            <Mail aria-hidden /> {t("login.emailCode")}
          </Button>
          <Button variant="outline" block onClick={() => setHash("qr")}>
            <QrCode aria-hidden /> {t("login.qr")}
          </Button>
          <Button variant="outline" block onClick={() => setHash("telegram")}>
            <Send aria-hidden /> {t("login.telegram")}
          </Button>
        </div>
      </details>

      <p className="mt-6 text-center text-sm text-text-2">
        {t("login.noAccount", { brand: BRAND })}{" "}
        <Link href="/register" className="font-medium text-primary-text underline-offset-4 hover:underline">
          {t("login.createAccount")}
        </Link>
      </p>
    </>
  );
}

function PasswordLogin({ next }: { next: string }) {
  const t = useTranslations("auth");
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const redirect = useAuthRedirect();
  const [formError, setFormError] = useState<string>();

  const form = useForm<z.input<typeof LoginInput>, unknown, z.output<typeof LoginInput>>({
    resolver: zodResolver(LoginInput),
    defaultValues: { email: "", password: "", remember: false },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: z.output<typeof LoginInput>) {
    setFormError(undefined);
    try {
      redirect(await apiFetch<AuthStep>(`/auth/login?next=${encodeURIComponent(next)}`, { body: values }));
    } catch (e) {
      const { message } = apiError(e);
      setFormError(message);
      form.setFocus("email");
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <FormAlert>{formError}</FormAlert>
      <Field id="login-email" label={t("login.email")} error={vt(errors.email?.message)}>
        {(a) => <Input type="email" autoComplete="username" autoFocus {...a} {...form.register("email")} />}
      </Field>
      <Field id="login-password" label={t("login.password")} error={vt(errors.password?.message)}>
        {(a) => (
          <Controller
            control={form.control}
            name="password"
            render={({ field }) => <PasswordField autoComplete="current-password" {...a} {...field} />}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <Checkbox
                id="login-remember"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="login-remember" className="font-normal text-text-2">
            {t("login.remember")}
          </Label>
        </div>
        <Link
          href="/forgot-password"
          className="rounded-sm text-sm font-medium text-primary-text underline-offset-4 hover:underline"
        >
          {t("login.forgot")}
        </Link>
      </div>
      <Button type="submit" block loading={isSubmitting}>
        {t("login.submit")}
      </Button>
    </form>
  );
}
