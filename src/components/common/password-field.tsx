"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { PASSWORD_RULES } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";

export interface PasswordFieldProps extends Omit<ComponentProps<"input">, "type"> {
  /** Show the live rule checklist (sign-up, reset, change password, MT5 password). */
  showRules?: boolean;
  /** Current value, used by the checklist. */
  value?: string;
}

/** Password input with show/hide and an optional live rule checklist. Same rules everywhere. */
export function PasswordField({
  showRules = false,
  value = "",
  className,
  id,
  ...props
}: PasswordFieldProps) {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  const rulesId = showRules && id ? `${id}-rules` : undefined;
  const describedBy = [props["aria-describedby"], rulesId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          className={cn("pr-12", className)}
          {...props}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("common.hide") : t("common.show")}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-11 place-content-center rounded-r-md text-text-3 transition-colors hover:text-text-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
      {showRules && (
        <div id={rulesId}>
          <p className="sr-only">{t("auth.passwordRules.title")}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(value);
              return (
                <li
                  key={rule.key}
                  className={cn(
                    "flex items-center gap-1.5 text-sm",
                    met ? "text-success-text" : "text-text-3",
                  )}
                >
                  {met ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
                  {t(`auth.passwordRules.${rule.key}`)}
                  <span className="sr-only">
                    ({met ? t("auth.passwordRules.met") : t("auth.passwordRules.notMet")})
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
