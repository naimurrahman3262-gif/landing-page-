import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps, MouseEvent } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-display font-medium whitespace-nowrap",
    "transition-colors duration-150 select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    "disabled:pointer-events-none disabled:not-aria-busy:opacity-50 aria-busy:cursor-progress aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Cyan fill, dark text. One per view. */
        primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
        secondary: "bg-surface-3 text-text-1 hover:bg-border-strong",
        outline: "border border-border-strong bg-transparent text-text-1 hover:bg-surface-2",
        ghost: "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text-1",
        danger: "bg-danger text-on-danger hover:opacity-90",
        link: "h-auto bg-transparent px-0 text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        /** 44px: touch-safe default (§11). */
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        /** 36px: dense desktop toolbars only; never the only target on touch layouts. */
        sm: "h-9 px-3 text-sm",
        icon: "size-11",
        "icon-sm": "size-9",
      },
      block: { true: "w-full" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, sets aria-busy and blocks repeat submits (§9). */
  loading?: boolean;
  /**
   * Disabled but still focusable, so a <Tooltip> can explain why
   * ("Nothing to withdraw: free margin is $0.00"). Clicks are ignored.
   */
  softDisabled?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  softDisabled = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={softDisabled || undefined}
      onClick={
        softDisabled
          ? (e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
            }
          : onClick
      }
      {...props}
    >
      {loading && !asChild ? (
        <>
          <LoaderCircle aria-hidden className="animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
