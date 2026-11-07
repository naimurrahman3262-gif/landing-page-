import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const inputClasses = cn(
  "flex h-11 w-full min-w-0 rounded-md border border-border-input bg-surface-1 px-3 text-base text-text-1 md:text-sm",
  "transition-colors placeholder:text-text-3",
  "focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary-border",
  "read-only:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger-soft",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
);

/** Base 16px on mobile prevents iOS zoom-on-focus. */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input data-slot="input" type={type} className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClasses, "h-auto min-h-24 resize-y py-2.5", className)}
      {...props}
    />
  );
}
