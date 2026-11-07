"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * Tooltip that also opens on tap (§11). Radix opens on hover and focus; on a
 * touch pointer we toggle it on click instead.
 * The trigger child must be focusable. To explain a disabled button, use
 * <Button softDisabled> (aria-disabled, stays focusable), not `disabled`.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const touch = useRef(false);

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen} delayDuration={200}>
      <TooltipPrimitive.Trigger
        asChild
        onPointerDown={(e) => {
          touch.current = e.pointerType === "touch";
        }}
        onClick={() => {
          if (touch.current) setOpen((o) => !o);
        }}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-50 max-w-72 rounded-sm border border-border-strong bg-surface-3 px-3 py-2 text-xs text-text-1 shadow-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0",
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
