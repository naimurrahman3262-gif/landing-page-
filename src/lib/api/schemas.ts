/**
 * Zod schemas shared by client forms, BFF route handlers and the mock backend.
 * One source of truth per contract (brief §8, §9: validate client and BFF).
 * Error messages are next-intl keys under `validation.*`.
 */
import { z } from "zod";

/* ----------------------------- primitives ----------------------------- */

export const PASSWORD_RULES = [
  { key: "length", test: (v: string) => v.length >= 8 && v.length <= 64 },
  { key: "lower", test: (v: string) => /[a-z]/.test(v) },
  { key: "upper", test: (v: string) => /[A-Z]/.test(v) },
  { key: "number", test: (v: string) => /\d/.test(v) },
  { key: "symbol", test: (v: string) => /[^A-Za-z0-9\s]/.test(v) },
] as const;
export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]["key"];

export const email = z.string().trim().min(1, "emailRequired").email("emailInvalid").max(254);
export const password = z
  .string()
  .min(1, "passwordRequired")
  .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), "passwordRules");
export const otpCode = z.string().regex(/^\d{6}$/, "codeInvalid");
export const countryCode = z.string().regex(/^[A-Z]{2}$/, "countryRequired");

/* -------------------------------- auth -------------------------------- */

export const LoginInput = z.object({
  email,
  password: z.string().min(1, "passwordRequired"),
  remember: z.boolean().default(false),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const RegisterInput = z.object({
  firstName: z.string().trim().min(1, "firstNameRequired").max(50),
  lastName: z.string().trim().min(1, "lastNameRequired").max(50),
  email,
  password,
  country: countryCode,
  acceptTerms: z.literal(true, { error: "termsRequired" }),
  referralCode: z
    .string()
    .trim()
    .max(32)
    .regex(/^[A-Za-z0-9-]*$/, "referralInvalid")
    .optional()
    .or(z.literal("")),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const VerifyEmailInput = z.object({ code: otpCode });
export const ChangeEmailInput = z.object({ email });
export const ForgotPasswordInput = z.object({ email });
export const ResetPasswordInput = z
  .object({ code: otpCode, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordMismatch" });
export const TwoFactorInput = z.object({
  method: z.enum(["totp", "email"]),
  code: otpCode,
  trustDevice: z.boolean().default(false),
});
export const EmailCodeStartInput = z.object({ email });
export const EmailCodeVerifyInput = z.object({ code: otpCode });

/* -------------------------------- user -------------------------------- */

export const KycStatus = z.enum(["unverified", "pending", "verified", "rejected"]);

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  country: z.string(),
  kycStatus: KycStatus,
  twoFactorEnabled: z.boolean(),
  partnerCode: z.string().nullable(),
  timeZone: z.string(),
  locale: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof User>;

/** Backend auth result. `mfaRequired` → the session is only half-open until /2fa. */
export const AuthResult = z.object({
  token: z.string(),
  mfaRequired: z.boolean(),
  user: User,
});
export type AuthResult = z.infer<typeof AuthResult>;

/* ---------------------------- notifications --------------------------- */

export const NotificationKind = z.enum(["deposit", "withdrawal", "kyc", "ticket", "campaign", "security"]);

export const Notification = z.object({
  id: z.string(),
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  createdAt: z.string(),
  read: z.boolean(),
});
export type Notification = z.infer<typeof Notification>;

export const NotificationList = z.object({ items: z.array(Notification), unread: z.number().int() });
export type NotificationList = z.infer<typeof NotificationList>;

/* ------------------------------- errors ------------------------------- */

export const ApiErrorBody = z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

/* ------------------------------ trading ------------------------------- */

export const AccountTypeId = z.enum(["standard", "pro", "cent"]);
export const AccountStatus = z.enum(["active", "inactive", "disabled", "readOnly"]);

export const Account = z.object({
  login: z.number().int(),
  label: z.string().max(40).nullable(),
  kind: z.enum(["live", "demo"]),
  type: AccountTypeId,
  status: AccountStatus,
  archived: z.boolean(),
  /** "USD" or "USC" (cent account: every money field is in cents). */
  currency: z.string(),
  balance: z.number(),
  credit: z.number(),
  equity: z.number(),
  margin: z.number(),
  freeMargin: z.number(),
  /** Percentage points; null when no margin is used. */
  marginLevel: z.number().nullable(),
  leverage: z.number().int(),
  server: z.string(),
  openPositions: z.number().int(),
  createdAt: z.string(),
  campaign: z.object({ name: z.string(), endedAt: z.string().nullable() }).nullable(),
});
export type Account = z.infer<typeof Account>;

export const AccountList = z.object({ items: z.array(Account), syncedAt: z.string() });
export type AccountList = z.infer<typeof AccountList>;

export const AccountType = z.object({
  id: AccountTypeId,
  name: z.string(),
  /** In USD. Same figure the Deposit page uses. */
  minDeposit: z.number(),
  spreadFrom: z.number(),
  /** USD per lot per side; null = no commission. */
  commissionPerLot: z.number().nullable(),
  maxLeverage: z.number().int(),
  leverageOptions: z.array(z.number().int()),
  currencies: z.array(z.string()),
  demoBalances: z.array(z.number()),
});
export type AccountType = z.infer<typeof AccountType>;

export const RenameAccountInput = z.object({ label: z.string().trim().max(40, "labelTooLong") });
export const ChangeLeverageInput = z.object({
  leverage: z.number().int().positive(),
  acceptTerms: z.literal(true),
});
export const ChangeMt5PasswordInput = z.object({
  type: z.enum(["master", "investor"]),
  password,
});
export const OpenAccountInput = z.object({
  kind: z.enum(["live", "demo"]),
  type: AccountTypeId,
  leverage: z.number().int().positive(),
  currency: z.string(),
  label: z.string().trim().max(40, "labelTooLong").optional(),
  demoBalance: z.number().positive().optional(),
});
export type OpenAccountInput = z.infer<typeof OpenAccountInput>;

export const OpenAccountResult = z.object({
  account: Account,
  credentials: z.object({
    login: z.number(),
    server: z.string(),
    masterPassword: z.string(),
    investorPassword: z.string(),
  }),
});

export const LeverageOptions = z.object({
  current: z.number().int(),
  options: z.array(z.number().int()),
  openPositions: z.number().int(),
});

export const StepUpStart = z.object({ method: z.enum(["totp", "email"]), sentTo: z.string().nullable() });
export const StepUpResult = z.object({ stepUpToken: z.string(), expiresInSeconds: z.number() });

export const Position = z.object({
  ticket: z.number().int(),
  login: z.number().int(),
  symbol: z.string(),
  side: z.enum(["buy", "sell"]),
  volume: z.number(),
  openPrice: z.number(),
  openTime: z.string(),
  currentPrice: z.number(),
  sl: z.number().nullable(),
  tp: z.number().nullable(),
  swap: z.number(),
  commission: z.number(),
  profit: z.number(),
  digits: z.number().int(),
});
export type Position = z.infer<typeof Position>;

export const PendingOrder = z.object({
  ticket: z.number().int(),
  login: z.number().int(),
  symbol: z.string(),
  type: z.enum(["buyLimit", "sellLimit", "buyStop", "sellStop"]),
  volume: z.number(),
  price: z.number(),
  currentPrice: z.number(),
  sl: z.number().nullable(),
  tp: z.number().nullable(),
  createdAt: z.string(),
  digits: z.number().int(),
});
export type PendingOrder = z.infer<typeof PendingOrder>;

export const Deal = z.object({
  ticket: z.number().int(),
  login: z.number().int(),
  symbol: z.string(),
  side: z.enum(["buy", "sell"]),
  volume: z.number(),
  openPrice: z.number(),
  openTime: z.string(),
  closePrice: z.number(),
  closeTime: z.string(),
  sl: z.number().nullable(),
  tp: z.number().nullable(),
  swap: z.number(),
  commission: z.number(),
  profit: z.number(),
  digits: z.number().int(),
});
export type Deal = z.infer<typeof Deal>;

export const TradingSummary = z.object({
  login: z.number().int(),
  currency: z.string(),
  equity: z.number(),
  balance: z.number(),
  credit: z.number(),
  margin: z.number(),
  freeMargin: z.number(),
  marginLevel: z.number().nullable(),
  /** Net of swap and commission, for closed deals in the period. */
  realizedPnl: z.number(),
  closedTrades: z.number().int(),
  openPnl: z.number(),
  syncedAt: z.string(),
  series: z.array(
    z.object({ date: z.string(), equity: z.number(), realizedCumulative: z.number(), volume: z.number() }),
  ),
});
export type TradingSummary = z.infer<typeof TradingSummary>;

/* ----------------------------- portfolio ------------------------------ */

export const PortfolioSummary = z.object({
  /** All in USD (cent accounts converted). Live, non-archived accounts only. */
  totalEquity: z.number(),
  totalBalance: z.number(),
  openPnl: z.number(),
  walletBalance: z.number(),
  syncedAt: z.string(),
});
export type PortfolioSummary = z.infer<typeof PortfolioSummary>;

export const Alert = z.object({
  id: z.string(),
  kind: z.enum(["kycPending", "kycRejected", "withdrawalRejected", "campaignEnding", "documentExpiring"]),
  severity: z.enum(["danger", "warning", "info"]),
  title: z.string(),
  body: z.string(),
  action: z.object({ label: z.string(), href: z.string() }).nullable(),
});
export type Alert = z.infer<typeof Alert>;

export const OnboardingStep = z.object({
  id: z.enum(["verifyEmail", "completeProfile", "verifyIdentity", "firstDeposit", "downloadPlatform"]),
  done: z.boolean(),
});
export const Onboarding = z.object({ steps: z.array(OnboardingStep) });
export type Onboarding = z.infer<typeof Onboarding>;

/* ----------------------------- transactions --------------------------- */

export const TransactionStatus = z.enum([
  "pending",
  "processing",
  "approved",
  "rejected",
  "cancelled",
  "failed",
]);
export const TransactionType = z.enum(["deposit", "withdrawal", "transfer"]);
export const AccountRef = z.union([
  z.object({ kind: z.literal("wallet") }),
  z.object({ kind: z.literal("mt5"), login: z.number().int() }),
]);
export type AccountRef = z.infer<typeof AccountRef>;

export const Transaction = z.object({
  id: z.string(),
  reference: z.string(),
  type: TransactionType,
  status: TransactionStatus,
  /** Always positive; direction comes from `type`. */
  amount: z.number().nonnegative(),
  fee: z.number().nonnegative(),
  currency: z.string(),
  method: z.string().nullable(),
  /** Deposit → destination; withdrawal → source; transfer → source. */
  account: AccountRef,
  /** Transfers only. */
  counterparty: AccountRef.nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Transaction = z.infer<typeof Transaction>;

export const TransactionPage = z.object({
  items: z.array(Transaction),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
