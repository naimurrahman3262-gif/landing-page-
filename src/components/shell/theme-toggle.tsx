"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_COOKIE } from "@/lib/auth/constants";

export type Theme = "dark" | "light";

/** Sets the theme cookie (read by the root layout, so there's no flash) and swaps it live. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations("shell");
  const [theme, setTheme] = useState<Theme>(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={next === "light" ? t("switchToLight") : t("switchToDark")}
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
    >
      {theme === "dark" ? <Sun aria-hidden className="size-5!" /> : <Moon aria-hidden className="size-5!" />}
    </Button>
  );
}
