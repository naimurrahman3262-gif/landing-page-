/**
 * The only formatters in the app (G5–G8). Never format money, dates, account
 * IDs, leverage or percentages anywhere else.
 *
 * Rules:
 * - Money is always 2 decimals, the minus sign (U+2212) comes before the
 *   symbol, and a sign shows direction ("+$50.90" in, "−$1,240.00" out).
 * - Dates use one format app-wide, in the user's time zone:
 *   "2 Nov 2026, 16:58 (GMT+6)".
 * - Non-finite input renders "—" and logs in dev. We never show NaN or a
 *   made-up figure.
 */
import { formatInTimeZone } from "date-fns-tz";

export const MINUS = "−";
export const PLACEHOLDER = "—";
const LOCALE = "en-GB";

/** Cent-account currency code. 100 USC = 1 USD. */
export const CENT_CURRENCY = "USC";

export type SignMode = "auto" | "always" | "never";

export interface MoneyOptions {
  /** auto: minus only when negative · always: + or − (none for zero) · never: absolute value */
  sign?: SignMode;
  /**
   * Cent account (USC). `amount` is in cents and renders as "95,000 USC".
   * Use `formatCentEquivalent` for the "≈ $950.00" line.
   */
  cents?: boolean;
  /**
   * Fraction digits. Default 2 (account and wallet money). Use 0 only for
   * indicative local-currency limits, e.g. "Min $50.00 · ₹4,200".
   */
  decimals?: 0 | 2;
}

function reportInvalid(fn: string, value: unknown): string {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[format] ${fn} received a non-finite value:`, value);
  }
  return PLACEHOLDER;
}

/** Round to `decimals`, and turn −0 into 0 so "−$0.00" can never appear. */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  // toPrecision strips binary float noise, so 1.005 rounds to 1.01 (not 1.00).
  const rounded = Math.round(Number((Math.abs(value) * factor).toPrecision(15))) / factor;
  return rounded === 0 ? 0 : Math.sign(value) * rounded;
}

function signPrefix(value: number, mode: SignMode): string {
  if (mode === "never" || value === 0) return "";
  if (value < 0) return MINUS;
  return mode === "always" ? "+" : "";
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();
function moneyFormatter(currency: string, decimals: number): Intl.NumberFormat {
  const key = `${currency}:${decimals}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

/**
 * $75,919.70 · −$1,240.00 · +$50.90 · 95,000 USC
 */
export function formatMoney(amount: number, currency = "USD", opts: MoneyOptions = {}): string {
  if (!Number.isFinite(amount)) return reportInvalid("formatMoney", amount);
  const { sign = "auto", cents = false } = opts;

  if (cents || currency === CENT_CURRENCY) {
    // A cent is already the minor unit, so whole cents show no decimals.
    const value = roundTo(amount, 2);
    const digits = Number.isInteger(value) ? 0 : 2;
    const body = formatNumber(Math.abs(value), digits);
    return `${signPrefix(value, sign)}${body} ${CENT_CURRENCY}`;
  }

  const decimals = opts.decimals ?? 2;
  const value = roundTo(amount, decimals);
  return `${signPrefix(value, sign)}${moneyFormatter(currency, decimals).format(Math.abs(value))}`;
}

/** "≈ $950.00": the USD equivalent shown under a cent-account balance. */
export function formatCentEquivalent(cents: number, opts: Pick<MoneyOptions, "sign"> = {}): string {
  if (!Number.isFinite(cents)) return reportInvalid("formatCentEquivalent", cents);
  return `≈ ${formatMoney(cents / 100, "USD", opts)}`;
}

/** Plain grouped number with fixed fraction digits: lots, prices, counts. */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return reportInvalid("formatNumber", value);
  const rounded = roundTo(value, decimals);
  const body = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(rounded));
  return `${rounded < 0 ? MINUS : ""}${body}`;
}

export type DateVariant = "date" | "datetime" | "time" | "relative";

export interface DateOptions {
  /** IANA zone from the user's preferences. Defaults to UTC. */
  timeZone?: string;
  /** Reference "now" for `relative` (for tests and server/client consistency). */
  now?: Date;
}

const RELATIVE = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/**
 * date: "2 Nov 2026" · datetime: "2 Nov 2026, 16:58 (GMT+6)" · time: "16:58"
 * relative: "just now", "5 minutes ago", "yesterday", then the "date" format after 6 days.
 */
export function formatDate(iso: string | Date, variant: DateVariant, opts: DateOptions = {}): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return reportInvalid("formatDate", iso);
  const timeZone = opts.timeZone ?? "UTC";

  switch (variant) {
    case "date":
      return formatInTimeZone(date, timeZone, "d MMM yyyy");
    case "time":
      return formatInTimeZone(date, timeZone, "HH:mm");
    case "datetime":
      return formatInTimeZone(date, timeZone, "d MMM yyyy, HH:mm (O)");
    case "relative": {
      const now = opts.now ?? new Date();
      const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
      const abs = Math.abs(seconds);
      if (abs < 45) return "just now";
      if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), "minute");
      if (abs < 86_400) return RELATIVE.format(Math.round(seconds / 3600), "hour");
      const days = dayDiffInZone(date, now, timeZone);
      if (Math.abs(days) <= 6) return RELATIVE.format(days, "day");
      return formatInTimeZone(date, timeZone, "d MMM yyyy");
    }
  }
}

/** Calendar-day difference in the user's zone (so "yesterday" means their yesterday). */
function dayDiffInZone(date: Date, now: Date, timeZone: string): number {
  const day = (d: Date) => Date.parse(`${formatInTimeZone(d, timeZone, "yyyy-MM-dd")}T00:00:00Z`);
  return Math.round((day(date) - day(now)) / 86_400_000);
}

/** One account ID format everywhere: "MT5 · 137481". */
export function formatAccountId(login: number): string {
  if (!Number.isFinite(login)) return reportInvalid("formatAccountId", login);
  return `MT5 · ${Math.trunc(login)}`;
}

/** "1:500" */
export function formatLeverage(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return reportInvalid("formatLeverage", n);
  return `1:${formatNumber(n, 0).replace(/,/g, "")}`;
}

export interface PercentOptions {
  sign?: SignMode;
  decimals?: number;
}

/**
 * Takes percentage points, as MT5 reports them: formatPercent(1543.2) → "1,543.20%".
 * Pass `sign: "always"` for deltas: "+2.40%".
 */
export function formatPercent(n: number, opts: PercentOptions = {}): string {
  if (!Number.isFinite(n)) return reportInvalid("formatPercent", n);
  const { sign = "auto", decimals = 2 } = opts;
  const value = roundTo(n, decimals);
  return `${signPrefix(value, sign)}${formatNumber(Math.abs(value), decimals)}%`;
}

/** Mask an account number or address: "•••• 5467". */
export function maskTail(value: string, visible = 4): string {
  const tail = value.replace(/\s/g, "").slice(-visible);
  return `•••• ${tail}`;
}
