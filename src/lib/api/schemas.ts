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

/* -------------------------------- funds -------------------------------- */

/** Wallet or an MT5 login, as a string for URLs and pickers: "wallet" | "137481". */
export const Destination = z.union([z.literal("wallet"), z.string().regex(/^\d{4,12}$/)]);
export type Destination = z.infer<typeof Destination>;

export const Wallet = z.object({ balance: z.number(), currency: z.string(), syncedAt: z.string() });
export type Wallet = z.infer<typeof Wallet>;

export const MethodKind = z.enum(["crypto", "bank", "upi", "local"]);

/** One payment method. Limits are in USD; `rate` converts to the local currency. */
export const Method = z.object({
  id: z.string(),
  name: z.string(),
  kind: MethodKind,
  /** Network or provider line, e.g. "TRON network (TRC20)". */
  description: z.string(),
  /** Real text, e.g. "Instant – 30 min" (old bug: icons only). */
  eta: z.string(),
  feeFixed: z.number(),
  feePct: z.number(),
  min: z.number(),
  max: z.number(),
  localCurrency: z.string(),
  /** Local currency units per 1 USD. */
  rate: z.number(),
  presets: z.array(z.number()),
  countries: z.array(z.string()).nullable(),
  howItWorks: z.array(z.string()),
  /** Withdrawals: can this method be used, and if not, why not. */
  withdrawable: z.boolean(),
  withdrawNote: z.string().nullable(),
});
export type Method = z.infer<typeof Method>;

export const MethodList = z.object({ items: z.array(Method), country: z.string() });

export const Quote = z.object({
  amount: z.number(),
  fee: z.number(),
  /** What reaches the destination, USD. */
  net: z.number(),
  rate: z.number(),
  localAmount: z.number(),
  localCurrency: z.string(),
  eta: z.string(),
});
export type Quote = z.infer<typeof Quote>;

export const DepositInput = z.object({
  methodId: z.string().min(1),
  destination: Destination,
  amount: z.number().positive().multipleOf(0.01),
});

export const Handoff = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("crypto"),
    network: z.string(),
    asset: z.string(),
    address: z.string(),
    expiresAt: z.string(),
  }),
  z.object({ kind: z.literal("redirect"), provider: z.string(), url: z.string() }),
  z.object({
    kind: z.literal("bank"),
    beneficiary: z.string(),
    bankName: z.string(),
    accountNumber: z.string(),
    ifsc: z.string(),
    reference: z.string(),
  }),
]);
export type Handoff = z.infer<typeof Handoff>;

export const TimelineStep = z.object({
  status: z.enum(["created", "pending", "processing", "approved", "rejected", "failed", "cancelled"]),
  at: z.string(),
  note: z.string().nullable(),
});

export const PayoutMethod = z.object({
  id: z.string(),
  type: z.enum(["bank", "crypto"]),
  /** Withdrawal method this payout destination uses. */
  methodId: z.string(),
  label: z.string(),
  /** Masked: "•••• 5467" or "TQ7m…9xQa". */
  masked: z.string(),
  holderName: z.string().nullable(),
  status: z.enum(["verified", "pending", "rejected"]),
  isDefault: z.boolean(),
  rejectionReason: z.string().nullable(),
});
export type PayoutMethod = z.infer<typeof PayoutMethod>;

export const AddPayoutInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bank"),
    methodId: z.string(),
    holderName: z.string().trim().min(2, "holderNameRequired").max(80),
    bankName: z.string().trim().min(2, "bankNameRequired").max(80),
    accountNumber: z.string().regex(/^\d{9,18}$/, "accountNumberInvalid"),
    ifsc: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "ifscInvalid"),
  }),
  z.object({
    type: z.literal("crypto"),
    methodId: z.string(),
    label: z.string().trim().min(1, "labelRequired").max(40),
    address: z
      .string()
      .trim()
      .regex(/^(T[1-9A-HJ-NP-Za-km-z]{33}|0x[a-fA-F0-9]{40})$/, "addressInvalid"),
  }),
]);
export type AddPayoutInput = z.infer<typeof AddPayoutInput>;

export const WithdrawInput = z.object({
  source: Destination,
  payoutMethodId: z.string().min(1),
  amount: z.number().positive().multipleOf(0.01),
});

export const TransferInput = z
  .object({ from: Destination, to: Destination, amount: z.number().positive().multipleOf(0.01) })
  .refine((v) => v.from !== v.to, { path: ["to"], message: "transferSame" });

export const FundsResult = z.object({
  transaction: Transaction,
  handoff: Handoff.nullable(),
  timeline: z.array(TimelineStep),
});
export type FundsResult = z.infer<typeof FundsResult>;

export const TransactionDetail = Transaction.extend({
  timeline: z.array(TimelineStep),
  handoff: Handoff.nullable(),
  /** Masked payout destination for withdrawals. */
  destinationMasked: z.string().nullable(),
  rate: z.number().nullable(),
  localAmount: z.number().nullable(),
  localCurrency: z.string().nullable(),
});
export type TransactionDetail = z.infer<typeof TransactionDetail>;

export const TransactionSummary = z.object({
  approvedDeposits: z.number(),
  approvedWithdrawals: z.number(),
  approvedDepositCount: z.number().int(),
  approvedWithdrawalCount: z.number().int(),
  /** approvedDeposits − approvedWithdrawals. Transfers between own accounts are excluded. */
  net: z.number(),
});
export type TransactionSummary = z.infer<typeof TransactionSummary>;

/* ------------------------------- account ------------------------------- */

export const Profile = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  country: z.string(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  postcode: z.string().nullable(),
  /** Fields locked after KYC: shown read-only with "Contact support to change". */
  locked: z.array(z.string()),
  completion: z.number().int().min(0).max(100),
});
export type Profile = z.infer<typeof Profile>;

export const ProfileInput = z.object({
  firstName: z.string().trim().min(1, "firstNameRequired").max(50),
  lastName: z.string().trim().min(1, "lastNameRequired").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "phoneInvalid")
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dobInvalid")
    .or(z.literal("")),
  country: countryCode,
  state: z.string().trim().max(80),
  city: z.string().trim().max(80),
  address: z.string().trim().max(160),
  postcode: z.string().trim().max(12),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

export const KycDocType = z.enum(["poiFront", "poiBack", "poa", "selfie"]);
export type KycDocType = z.infer<typeof KycDocType>;

export const KycDocument = z.object({
  type: KycDocType,
  status: z.enum(["missing", "pending", "verified", "rejected", "expired"]),
  fileName: z.string().nullable(),
  uploadedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
});
export type KycDocument = z.infer<typeof KycDocument>;

export const Kyc = z.object({
  status: KycStatus,
  documents: z.array(KycDocument),
  reviewedAt: z.string().nullable(),
});
export type Kyc = z.infer<typeof Kyc>;

/** Upload metadata. The real BFF streams the file (multipart) to the backend. */
export const KycUploadInput = z.object({
  type: KycDocType,
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export const Session = z.object({
  id: z.string(),
  device: z.string(),
  location: z.string(),
  ip: z.string(),
  lastActiveAt: z.string(),
  current: z.boolean(),
});
export const LoginEvent = z.object({
  at: z.string(),
  device: z.string(),
  location: z.string(),
  result: z.enum(["success", "failed", "twoFactorFailed"]),
});
export const SecurityOverview = z.object({
  twoFactorEnabled: z.boolean(),
  backupCodesRemaining: z.number().int(),
  passwordChangedAt: z.string().nullable(),
  sessions: z.array(Session),
  loginHistory: z.array(LoginEvent),
});
export type SecurityOverview = z.infer<typeof SecurityOverview>;

export const ChangePasswordInput = z
  .object({ current: z.string().min(1, "passwordRequired"), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordMismatch" })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "passwordSame" });

export const Preferences = z.object({
  locale: z.string(),
  theme: z.enum(["dark", "light"]),
  timeZone: z.string(),
  sound: z.boolean(),
  notifications: z.object({
    email: z.object({
      funds: z.boolean(),
      security: z.boolean(),
      support: z.boolean(),
      marketing: z.boolean(),
    }),
    push: z.object({
      funds: z.boolean(),
      security: z.boolean(),
      support: z.boolean(),
      marketing: z.boolean(),
    }),
  }),
});
export type Preferences = z.infer<typeof Preferences>;

/* --------------------------------- help -------------------------------- */

export const Article = z.object({
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  summary: z.string(),
  body: z.array(z.string()),
  updatedAt: z.string(),
  popular: z.boolean(),
});
export type Article = z.infer<typeof Article>;

export const TicketCategory = z.enum([
  "deposit",
  "withdrawal",
  "account",
  "trading",
  "verification",
  "other",
]);
export const TicketStatus = z.enum(["open", "awaitingReply", "closed"]);

export const TicketMessage = z.object({
  id: z.string(),
  author: z.enum(["client", "support"]),
  authorName: z.string(),
  body: z.string(),
  at: z.string(),
  attachments: z.array(z.object({ name: z.string(), size: z.number() })),
});

export const Ticket = z.object({
  id: z.string(),
  number: z.number().int(),
  subject: z.string(),
  category: TicketCategory,
  status: TicketStatus,
  login: z.number().int().nullable(),
  transactionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(TicketMessage),
});
export type Ticket = z.infer<typeof Ticket>;

export const NewTicketInput = z.object({
  category: TicketCategory,
  login: z.number().int().nullable(),
  transactionId: z.string().nullable(),
  subject: z.string().trim().min(5, "subjectShort").max(120),
  description: z.string().trim().min(20, "descriptionShort").max(5000),
  attachments: z.array(z.object({ name: z.string(), size: z.number().max(10 * 1024 * 1024) })).max(5),
});
export type NewTicketInput = z.infer<typeof NewTicketInput>;

export const TicketReplyInput = z.object({
  body: z.string().trim().min(1, "replyRequired").max(5000),
  attachments: z.array(z.object({ name: z.string(), size: z.number() })).max(5),
});

export const ChatMessageInput = z.object({
  body: z.string().trim().min(1, "replyRequired").max(2000),
  /** Page the user is on, so the agent has context (path only, no query string). */
  context: z.object({ page: z.string().max(200) }),
});
export const ChatMessage = z.object({
  id: z.string(),
  author: z.enum(["client", "support"]),
  body: z.string(),
  at: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;
