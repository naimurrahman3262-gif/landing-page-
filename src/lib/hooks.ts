"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";

/** Countdown for "Resend code in 42s". */
export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);
  return { seconds, restart: useCallback((s: number) => setSeconds(s), []) };
}

/** URL hash as state, so sub-modes (#qr, #email-code) work with browser Back. */
export function useHash(): [string, (hash: string) => void] {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash.replace(/^#/, ""));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const set = useCallback((next: string) => {
    if (next) window.location.hash = next;
    else history.pushState(null, "", window.location.pathname + window.location.search);
    setHash(next);
  }, []);
  return [hash, set];
}

/**
 * Map an API error to copy that says what happened + what to do (§10).
 * Field errors come back as validation keys.
 */
export function useApiErrorMessage() {
  const t = useTranslations();
  return useCallback(
    (error: unknown): { message: string; fields: Record<string, string> } => {
      if (!(error instanceof ApiError)) return { message: t("auth.errors.generic"), fields: {} };
      const known = t.has(`auth.errors.${error.code}`);
      const fields = Object.fromEntries(
        Object.entries(error.fields).map(([k, v]) => [
          k,
          t.has(`validation.${v}`) ? t(`validation.${v}`) : v,
        ]),
      );
      return {
        message: known
          ? t(`auth.errors.${error.code}` as "auth.errors.generic")
          : error.status >= 500 || error.code === "MOCK_FORCED_ERROR"
            ? t("auth.errors.generic")
            : error.message,
        fields,
      };
    },
    [t],
  );
}

/** Translate a Zod message key from a form error. */
export function useValidationMessage() {
  const t = useTranslations("validation");
  return useCallback(
    (key: string | undefined) => (key ? (t.has(key) ? t(key as "emailRequired") : key) : undefined),
    [t],
  );
}
