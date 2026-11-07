import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-lg border text-text-1", {
  variants: {
    tone: {
      default: "border-border bg-surface-1",
      raised: "border-border bg-surface-2",
      /** Selected state: filled tint + cyan border (never just a hover look). */
      selected: "border-primary-border bg-primary-soft",
    },
    padding: { none: "", sm: "p-4", md: "p-4 md:p-6" },
    interactive: {
      true: "cursor-pointer transition-colors focus-within:border-border-strong hover:border-border-strong",
    },
  },
  defaultVariants: { tone: "default", padding: "md" },
});

export interface CardProps extends ComponentProps<"div">, VariantProps<typeof cardVariants> {}

export function Card({ className, tone, padding, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ tone, padding, interactive }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: ComponentProps<"h3">) {
  return (
    <h3 className={cn("font-display text-base font-bold text-text-1", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-text-2", className)} {...props} />;
}
