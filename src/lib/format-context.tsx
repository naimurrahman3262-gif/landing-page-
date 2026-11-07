"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { formatDate, type DateVariant } from "./format";

interface FormatSettings {
  /** The user's IANA time zone (from preferences; Phase 3+). */
  timeZone: string;
}

const FormatContext = createContext<FormatSettings>({ timeZone: "UTC" });

export function FormatProvider({ timeZone, children }: FormatSettings & { children: ReactNode }) {
  const value = useMemo(() => ({ timeZone }), [timeZone]);
  return <FormatContext.Provider value={value}>{children}</FormatContext.Provider>;
}

/** Date formatting bound to the user's time zone. Use this in components. */
export function useFormatDate() {
  const { timeZone } = useContext(FormatContext);
  return (iso: string | Date, variant: DateVariant, now?: Date) =>
    formatDate(iso, variant, { timeZone, now });
}

export function useTimeZone(): string {
  return useContext(FormatContext).timeZone;
}
