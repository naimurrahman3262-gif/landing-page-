import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Loading placeholder. Pulse becomes static under prefers-reduced-motion. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-3 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
