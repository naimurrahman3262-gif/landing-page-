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
