"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Field } from "@/components/common/field";
import { PasswordField } from "@/components/common/password-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND } from "@/config/brand";
import { countryOptions } from "@/config/countries";
import { LINKS } from "@/config/links";
import { apiFetch } from "@/lib/api/client";
import { RegisterInput } from "@/lib/api/schemas";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";
import { AuthHeading, Divider, FormAlert } from "./auth-card";
import { GoogleIcon } from "./google-icon";
import { useAuthRedirect, type AuthStep } from "./login-form";

type Values = z.input<typeof RegisterInput>;

/** Step 1 only (brief §6.1): no phone, state or city at sign-up. */
export function RegisterForm({ detectedCountry, referral }: { detectedCountry?: string; referral?: string }) {
  const t = useTranslations("auth.register");
  const tc = useTranslations("common");
  const locale = useLocale();
  const vt = useValidationMessage();
  const apiError = useApiErrorMessage();
  const redirect = useAuthRedirect();
  const [formError, setFormError] = useState<string>();
  const countries = useMemo(() => countryOptions(locale), [locale]);

  const form = useForm<Values, unknown, z.output<typeof RegisterInput>>({
    resolver: zodResolver(RegisterInput),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      country: countries.some((c) => c.code === detectedCountry) ? detectedCountry : "",
      acceptTerms: false as unknown as true,
      referralCode: referral ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: z.output<typeof RegisterInput>) {
    setFormError(undefined);
    try {
      redirect(await apiFetch<AuthStep>("/auth/register", { body: values }));
    } catch (e) {
      const { message, fields } = apiError(e);
      for (const [name, msg] of Object.entries(fields)) form.setError(name as keyof Values, { message: msg });
      if (Object.keys(fields).length === 0) setFormError(message);
    }
  }

  const docLink = (href: string | null, label: string): ReactNode =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary-text underline underline-offset-4"
      >
        {label}
      </a>
    ) : (
      <span className="font-medium text-text-1">{label}</span>
    );

  return (
    <>
      <AuthHeading title={t("heading", { brand: BRAND })} subtitle={t("subtitle")} />
      {/* Full navigation on purpose: the BFF answers with an OAuth redirect. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/auth/oauth/google" className={buttonVariants({ variant: "outline", block: true })}>
        <GoogleIcon /> {t("google")}
      </a>
      <Divider label={tc("or")} />

      <FormAlert>{formError}</FormAlert>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="reg-first" label={t("firstName")} required error={vt(errors.firstName?.message)}>
            {(a) => <Input autoComplete="given-name" {...a} {...form.register("firstName")} />}
          </Field>
          <Field id="reg-last" label={t("lastName")} required error={vt(errors.lastName?.message)}>
            {(a) => <Input autoComplete="family-name" {...a} {...form.register("lastName")} />}
          </Field>
        </div>
        <Field id="reg-email" label={t("email")} required error={vt(errors.email?.message)}>
          {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
        </Field>
        <Field id="reg-password" label={t("password")} required error={vt(errors.password?.message)}>
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
        <Field
          id="reg-country"
          label={t("country")}
          required
          hint={detectedCountry ? t("countryHint") : undefined}
          error={vt(errors.country?.message)}
        >
          {(a) => (
            <Controller
              control={form.control}
              name="country"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...a} onBlur={field.onBlur}>
                    <SelectValue placeholder={t("countryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>
        <Field
          id="reg-referral"
          label={t("referral")}
          hint={t("referralHint")}
          error={vt(errors.referralCode?.message)}
        >
          {(a) => (
            <Input autoComplete="off" autoCapitalize="characters" {...a} {...form.register("referralCode")} />
          )}
        </Field>

        <div className="grid gap-2">
          <div className="flex items-start gap-3">
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="reg-terms"
                  className="mt-0.5"
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={errors.acceptTerms ? true : undefined}
                  aria-describedby={errors.acceptTerms ? "reg-terms-error" : undefined}
                />
              )}
            />
            {/* Label wraps text only; the three documents are separate links (brief §6.1). */}
            <p className="text-sm text-text-2">
              <label htmlFor="reg-terms">{t("termsPrefix")}</label> {docLink(LINKS.privacy, t("privacy"))},{" "}
              {docLink(LINKS.terms, t("terms"))} {t("and")}{" "}
              {docLink(LINKS.riskDisclosure, t("riskDisclosure"))}.
            </p>
          </div>
          {errors.acceptTerms && (
            <p id="reg-terms-error" className="text-sm text-danger-text">
              {vt(errors.acceptTerms.message)}
            </p>
          )}
        </div>

        <Button type="submit" block loading={isSubmitting}>
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-2">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary-text underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
