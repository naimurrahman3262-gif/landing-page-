"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { ErrorState } from "@/components/common/error-state";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { countryOptions } from "@/config/countries";
import { REGIONS, validPostcode } from "@/config/regions";
import { useProfile, useSaveProfile } from "@/lib/api/queries/account";
import { ProfileInput, type Profile } from "@/lib/api/schemas";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";

/**
 * Profile (brief §6.10). KYC-verified fields are locked with a lock icon and
 * "Contact support to change". Country → dependent state list → postcode format.
 */
export function ProfileView() {
  const t = useTranslations("profile");
  const q = useProfile();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={t("title")}
        subtitle={q.data ? t("completion", { percent: q.data.completion }) : t("subtitle")}
      />
      {q.data && (
        <div
          className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-label={t("completion", { percent: q.data.completion })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={q.data.completion}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${q.data.completion}%` }} />
        </div>
      )}
      {q.isPending && <Skeleton className="h-96" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && <ProfileForm profile={q.data} />}
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const vt = useValidationMessage();
  const tv = useTranslations("validation");
  const locale = useLocale();
  const apiError = useApiErrorMessage();
  const save = useSaveProfile();
  const countries = useMemo(() => countryOptions(locale), [locale]);
  const locked = new Set(profile.locked);

  const defaults = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    country: profile.country,
    state: profile.state ?? "",
    city: profile.city ?? "",
    address: profile.address ?? "",
    postcode: profile.postcode ?? "",
  };
  const form = useForm<ProfileInput>({ resolver: zodResolver(ProfileInput), defaultValues: defaults });
  const { errors, isDirty } = form.formState;
  const country = form.watch("country");
  const region = REGIONS[country];

  // Changing country clears a state that doesn't belong to it.
  useEffect(() => {
    const state = form.getValues("state");
    if (region && state && !region.states.includes(state)) form.setValue("state", "", { shouldDirty: true });
  }, [country, region, form]);

  async function onSubmit(v: ProfileInput) {
    if (!validPostcode(v.country, v.postcode)) {
      form.setError("postcode", {
        message: region?.postcodeExample
          ? tv("postcodeInvalid", { example: region.postcodeExample })
          : tv("postcodeInvalidGeneric"),
      });
      return;
    }
    try {
      const next = await save.mutateAsync(v);
      form.reset({
        ...v,
        phone: next.phone ?? "",
        dateOfBirth: next.dateOfBirth ?? "",
        state: next.state ?? "",
        city: next.city ?? "",
        address: next.address ?? "",
        postcode: next.postcode ?? "",
      });
      toast.success(t("saved"));
    } catch (e) {
      const { message, fields } = apiError(e);
      if (Object.keys(fields).length) {
        for (const [k, msg] of Object.entries(fields))
          form.setError(k as keyof ProfileInput, { message: msg });
      } else form.setError("root", { message });
    }
  }

  const lockHint = (
    <span className="flex items-center gap-1">
      <Lock aria-hidden className="size-3.5" /> {t("lockedHint")}{" "}
      <Link
        href="/help/tickets?new=1&category=account"
        className="font-medium text-primary-text underline-offset-4 hover:underline"
      >
        {t("contactSupport")}
      </Link>
    </span>
  );

  const text = (
    name: keyof ProfileInput,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    hint?: React.ReactNode,
  ) => {
    const isLocked = locked.has(name);
    return (
      <Field
        id={`pf-${name}`}
        label={label}
        error={vt(errors[name]?.message)}
        hint={isLocked ? lockHint : hint}
      >
        {(a) => (
          <div className="relative">
            <Input
              {...a}
              {...props}
              readOnly={isLocked}
              {...form.register(name)}
              className={isLocked ? "pr-10" : undefined}
            />
            {isLocked && (
              <Lock
                aria-label={t("locked")}
                className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-3"
              />
            )}
          </div>
        )}
      </Field>
    );
  };

  return (
    <form method="post" noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
      <FormAlert>{errors.root?.message}</FormAlert>
      <Card className="grid gap-4">
        <CardTitle>{t("personal")}</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("firstName", t("firstName"), { autoComplete: "given-name" })}
          {text("lastName", t("lastName"), { autoComplete: "family-name" })}
          {text("dateOfBirth", t("dob"), { type: "date", autoComplete: "bday" })}
        </div>
      </Card>

      <Card className="grid gap-4">
        <CardTitle>{t("contact")}</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="pf-email"
            label={t("email")}
            hint={
              <Link href="/account/security" className="text-primary-text underline-offset-4 hover:underline">
                {t("emailHint")}
              </Link>
            }
          >
            {(a) => <Input {...a} value={profile.email} readOnly />}
          </Field>
          {text("phone", t("phone"), { type: "tel", autoComplete: "tel", inputMode: "tel" })}
        </div>
      </Card>

      <Card className="grid gap-4">
        <CardTitle>{t("address")}</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="pf-country"
            label={t("country")}
            error={vt(errors.country?.message)}
            hint={locked.has("country") ? lockHint : undefined}
          >
            {(a) => (
              <Controller
                control={form.control}
                name="country"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={locked.has("country")}>
                    <SelectTrigger {...a}>
                      <SelectValue />
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
          {region ? (
            <Field id="pf-state" label={t("state")} error={vt(errors.state?.message)}>
              {(a) => (
                <Controller
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger {...a}>
                        <SelectValue placeholder={t("statePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {region.states.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
          ) : (
            text("state", t("state"), { autoComplete: "address-level1" })
          )}
          {text("city", t("city"), { autoComplete: "address-level2" })}
          {text("postcode", t("postcode"), { autoComplete: "postal-code" })}
          <div className="sm:col-span-2">
            {text("address", t("street"), { autoComplete: "street-address" })}
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
