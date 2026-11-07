import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error text: what happened + what to do (§10). */
  error?: string;
  /** Receives aria props to spread onto the control. */
  children: (control: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
    "aria-required": boolean | undefined;
  }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error wiring, so every form field is accessible the same way. */
export function Field({ id, label, required, hint, error, children, className }: FieldProps) {
  const t = useTranslations("common");
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-danger-text" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only">({t("required")})</span>}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger-text">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-sm text-text-3">
          {hint}
        </p>
      )}
    </div>
  );
}
