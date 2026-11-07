"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { ErrorState } from "@/components/common/error-state";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { applyTheme } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { LOCALES } from "@/i18n/locales";
import { usePreferences, useSavePreferences } from "@/lib/api/queries/account";
import type { Preferences } from "@/lib/api/schemas";
import { useApiErrorMessage } from "@/lib/hooks";

const TOPICS = ["funds", "security", "support", "marketing"] as const;
const CHANNELS = ["email", "push"] as const;
const FALLBACK_ZONES = [
  "UTC",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Ho_Chi_Minh",
  "Asia/Dubai",
  "Europe/London",
];

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return FALLBACK_ZONES;
  }
}

function offsetLabel(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** Preferences (brief §6.10): language, theme, time zone, notifications, sound. */
export function PreferencesView() {
  const t = useTranslations("preferences");
  const q = usePreferences();
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {q.isPending && <Skeleton className="h-96" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && <PreferencesForm initial={q.data} />}
    </div>
  );
}

function PreferencesForm({ initial }: { initial: Preferences }) {
  const t = useTranslations("preferences");
  const tl = useTranslations("languages");
  const apiError = useApiErrorMessage();
  const save = useSavePreferences();
  const [p, setP] = useState(initial);
  const [error, setError] = useState<string>();
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);
  const zones = useMemo(() => {
    const all = timeZones();
    return all.includes(p.timeZone) ? all : [p.timeZone, ...all];
  }, [p.timeZone]);
  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: p.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).format(new Date());

  const toggle = (channel: (typeof CHANNELS)[number], topic: (typeof TOPICS)[number], on: boolean) =>
    setP((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [channel]: { ...prev.notifications[channel], [topic]: on } },
    }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      const saved = await save.mutateAsync(p);
      if (saved.theme !== initial.theme) applyTheme(saved.theme);
      toast.success(t("saved"));
    } catch (err) {
      setError(apiError(err).message);
    }
  }

  return (
    <form method="post" noValidate onSubmit={submit} className="grid gap-6">
      <FormAlert>{error}</FormAlert>
      <Card className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pref-locale" label={t("language")}>
            {(a) => (
              <Select value={p.locale} onValueChange={(locale) => setP({ ...p, locale })}>
                <SelectTrigger {...a}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {tl(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <div className="grid gap-2">
            <span id="pref-theme" className="text-sm font-medium">
              {t("theme")}
            </span>
            <SegmentedControl
              aria-labelledby="pref-theme"
              value={p.theme}
              onValueChange={(v) => setP({ ...p, theme: v as Preferences["theme"] })}
              className="w-fit"
            >
              <SegmentedControlItem value="dark">
                <Moon aria-hidden /> {t("dark")}
              </SegmentedControlItem>
              <SegmentedControlItem value="light">
                <Sun aria-hidden /> {t("light")}
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>
        <Field id="pref-tz" label={t("timeZone")} hint={t("timeZoneHint", { now })}>
          {(a) => (
            <Select value={p.timeZone} onValueChange={(timeZone) => setP({ ...p, timeZone })}>
              <SelectTrigger {...a}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {zones.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z.replaceAll("_", " ")} ({offsetLabel(z)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-0.5">
            <label htmlFor="pref-sound" className="text-sm font-medium">
              {t("sound")}
            </label>
            <span id="pref-sound-hint" className="text-sm text-text-3">
              {t("soundHint")}
            </span>
          </div>
          <Switch
            id="pref-sound"
            aria-describedby="pref-sound-hint"
            checked={p.sound}
            onCheckedChange={(sound) => setP({ ...p, sound })}
          />
        </div>
      </Card>

      <Card className="grid gap-4">
        <CardTitle>{t("notifications")}</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-3">
              <th scope="col" className="pb-2 font-medium">
                <span className="sr-only">{t("notifications")}</span>
              </th>
              {CHANNELS.map((c) => (
                <th key={c} scope="col" className="w-16 pb-2 text-center font-medium">
                  {t(`channel.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TOPICS.map((topic) => (
              <tr key={topic}>
                <th scope="row" className="py-3 pr-2 text-left font-normal">
                  {t(`topics.${topic}`)}
                  {topic === "security" && (
                    <span className="block text-xs text-text-3">{t("securityAlwaysOn")}</span>
                  )}
                </th>
                {CHANNELS.map((c) => (
                  <td key={c} className="py-3 text-center">
                    <Switch
                      aria-label={`${t(`topics.${topic}`)}: ${t(`channel.${c}`)}`}
                      checked={topic === "security" ? true : p.notifications[c][topic]}
                      disabled={topic === "security"}
                      onCheckedChange={(on) => toggle(c, topic, on)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending} disabled={!dirty}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
