"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Single-choice segmented control: 7D / 30D / 90D, Grid / Table, Master / Investor.
 * Always has a value (clicking the active segment does not clear it).
 */
export function SegmentedControl({
  className,
  value,
  onValueChange,
  ...props
}: Omit<
  ComponentProps<typeof ToggleGroupPrimitive.Root>,
  "type" | "value" | "onValueChange" | "defaultValue"
> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="segmented-control"
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v)}
      className={cn("inline-flex h-11 items-center gap-1 rounded-md bg-surface-2 p-1", className)}
      {...props}
    />
  );
}

export function SegmentedControlItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="segmented-control-item"
      className={cn(
        "inline-flex h-full min-w-11 items-center justify-center gap-1.5 rounded-sm px-3 font-display text-sm font-medium text-text-2 transition-colors",
        "hover:text-text-1 data-[state=on]:bg-surface-3 data-[state=on]:text-text-1 data-[state=on]:shadow-1",
        "focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-50 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
