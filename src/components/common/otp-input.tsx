"use client";

import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires when all 6 digits are entered (auto-submit). */
  onComplete?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

/** 6-digit one-time code. Paste, SMS/email autofill and screen readers work as one field. */
export function OtpInput({ value, onChange, onComplete, invalid, ...props }: OtpInputProps) {
  return (
    <OTPInput
      maxLength={6}
      inputMode="numeric"
      pattern={REGEXP_ONLY_DIGITS}
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      aria-invalid={invalid || undefined}
      containerClassName="flex items-center gap-2 has-[:disabled]:opacity-50"
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <Slot key={i} {...slot} invalid={invalid} />
          ))}
        </>
      )}
      {...props}
    />
  );
}

function Slot({ char, isActive, hasFakeCaret, invalid }: SlotProps & { invalid?: boolean }) {
  return (
    <div
      className={cn(
        "relative grid h-12 w-11 place-content-center rounded-md border bg-surface-1 font-display text-xl font-bold tabular transition-colors",
        invalid ? "border-danger" : "border-border-input",
        isActive && "border-focus-ring outline-2 outline-primary-border",
      )}
    >
      {char}
      {hasFakeCaret && (
        <span aria-hidden className="pointer-events-none absolute inset-0 grid place-content-center">
          <span className="h-5 w-px animate-pulse bg-text-1 motion-reduce:animate-none" />
        </span>
      )}
    </div>
  );
}
