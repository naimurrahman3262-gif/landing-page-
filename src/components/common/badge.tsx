import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Non-status labels: account type ("Standard", "Cent"), "Campaign", "Default", "New". */
const badgeVariants = cva(
  "inline-flex h-6 items-center gap-1 rounded-sm px-2 font-display text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "bg-surface-3 text-text-2",
        outline: "border border-border-strong text-text-2",
        brand: "bg-primary-soft text-primary-text",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
