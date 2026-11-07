"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-input transition-colors",
        "after:absolute after:-inset-2.5 after:content-['']",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-3",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4.5 rounded-full shadow-1 transition-transform",
          "data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-text-2",
          "data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-on-primary",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
