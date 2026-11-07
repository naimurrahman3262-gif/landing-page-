import { cva, type VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { CENT_CURRENCY, formatCentEquivalent, formatMoney, type SignMode } from "@/lib/format";
import { cn } from "@/lib/utils";

const moneyVariants = cva("font-display whitespace-nowrap tabular", {
  variants: {
    size: {
      sm: "text-sm font-medium",
      md: "text-base font-medium",
      lg: "text-2xl font-bold",
      xl: "text-3xl font-bold tracking-tight md:text-4xl",
    },
  },
  defaultVariants: { size: "md" },
});

export interface MoneyTextProps extends VariantProps<typeof moneyVariants> {
  /** From the data layer only. Never a literal. */
  amount: number;
  currency?: string;
  /** "direction": + in (green) / − out (default text). Status is never shown with colour here. */
  tone?: "plain" | "direction";
  sign?: SignMode;
  /** Failed, rejected or cancelled amounts: muted + strikethrough, with screen-reader text. */
  voided?: boolean;
  /** Show "≈ $950.00" under cent-account amounts. Default true. */
  showCentEquivalent?: boolean;
  className?: string;
}

export function MoneyText({
  amount,
  currency = "USD",
  tone = "plain",
  sign,
  voided = false,
  showCentEquivalent = true,
  size,
  className,
}: MoneyTextProps) {
  const t = useTranslations("common");
  const isCents = currency === CENT_CURRENCY;
  const effectiveSign = sign ?? (tone === "direction" ? "always" : "auto");
  const text = formatMoney(amount, currency, { sign: effectiveSign });

  const color = voided
    ? "text-text-3 line-through decoration-1"
    : tone === "direction" && amount > 0
      ? "text-money-in"
      : "text-money-out";

  return (
    <span className={cn("inline-flex flex-col", className)} data-slot="money">
      <span className={cn(moneyVariants({ size }), color)}>
        {text}
        {voided && <span className="sr-only"> ({t("notCompleted")})</span>}
      </span>
      {isCents && showCentEquivalent && (
        <span className="text-xs text-text-3 tabular">{formatCentEquivalent(amount)}</span>
      )}
    </span>
  );
}
