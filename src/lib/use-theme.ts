"use client";

import { useSyncExternalStore } from "react";

/** The current theme from `<html data-theme>`, live as it changes. */
export function useTheme(): "dark" | "light" {
  return useSyncExternalStore(
    (notify) => {
      const obs = new MutationObserver(notify);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => obs.disconnect();
    },
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}
