import { http, HttpResponse } from "msw";
import {
  ChangeEmailInput,
  EmailCodeStartInput,
  EmailCodeVerifyInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  TwoFactorInput,
  VerifyEmailInput,
} from "@/lib/api/schemas";
import { DEMO_CODE } from "../fixtures/users";
import { cloneVerifiedPersona, db, findUserByEmail, newId, publicUser } from "../store";
import { BACKEND_URL, forcedError, mockLatency } from "../utils";
import { z } from "zod";

const json = <T>(body: T, status = 200) => HttpResponse.json(body as object, { status });
const error = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  json({ code, message, ...(fields ? { fields } : {}) }, status);

function bearer(request: Request): string | null {
  const h = request.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Resolve the session for an authenticated call. `allowMfaPending` for the /2fa step itself. */
export function sessionUser(request: Request, allowMfaPending = false) {
  const token = bearer(request);
  const session = token ? db().sessions.get(token) : undefined;
  if (!token || !session) return null;
  if (session.mfaPending && !allowMfaPending) return null;
  const user = db().users.get(session.userId);
  return user ? { token, session, user } : null;
}

function openSession(userId: string, mfaPending: boolean) {
  const token = newId("sess");
  db().sessions.set(token, { userId, mfaPending });
  const user = db().users.get(userId)!;
  return { token, mfaRequired: mfaPending, user: publicUser(user) };
}

async function parse<S extends z.ZodType>(request: Request, schema: S) {
  const result = schema.safeParse(await request.json().catch(() => ({})));
  if (result.success) return { data: result.data as z.infer<S>, fail: null };
  const fields = Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
  return { data: null, fail: error(422, "VALIDATION", "Some fields need attention.", fields) };
}

const A = `${BACKEND_URL}/auth`;

export const authHandlers = [
  http.post(`${A}/login`, async ({ request }) => {
    await mockLatency();
    const forced = forcedError(request, "login");
    if (forced) return forced;
    const { data, fail } = await parse(request, LoginInput);
    if (fail) return fail;
    const user = findUserByEmail(data.email) ?? cloneVerifiedPersona(data.email);
    if (!user || user.password !== data.password) {
      return error(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
    }
    return json(openSession(user.id, user.twoFactorEnabled));
  }),

  http.post(`${A}/register`, async ({ request }) => {
    await mockLatency();
    const forced = forcedError(request, "register");
    if (forced) return forced;
    const { data, fail } = await parse(request, RegisterInput);
    if (fail) return fail;
    if (findUserByEmail(data.email)) {
      return error(409, "EMAIL_TAKEN", "An account with this email already exists.", { email: "emailTaken" });
    }
    const id = newId("u");
    db().users.set(id, {
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      emailVerified: false,
      country: data.country,
      kycStatus: "unverified",
      twoFactorEnabled: false,
      partnerCode: null,
      timeZone: "UTC",
      locale: "en",
      createdAt: new Date().toISOString(),
    });
    return json(openSession(id, false), 201);
  }),

  http.post(`${A}/2fa`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request, true);
    if (!s) return error(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
    const { data, fail } = await parse(request, TwoFactorInput);
    if (fail) return fail;
    if (data.code !== DEMO_CODE) return error(400, "CODE_INVALID", "That code is incorrect or expired.");
    s.session.mfaPending = false;
    return json({ token: s.token, mfaRequired: false, user: publicUser(s.user) });
  }),

  http.post(`${A}/2fa/email-code`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request, true);
    if (!s) return error(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
    return json({ sentTo: maskEmail(s.user.email), resendInSeconds: 60 });
  }),

  http.post(`${A}/verify-email`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request);
    if (!s) return error(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
    const { data, fail } = await parse(request, VerifyEmailInput);
    if (fail) return fail;
    if (data.code !== DEMO_CODE) return error(400, "CODE_INVALID", "That code is incorrect or expired.");
    s.user.emailVerified = true;
    return json({ user: publicUser(s.user) });
  }),

  http.post(`${A}/verify-email/resend`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request);
    if (!s) return error(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
    return json({ sentTo: maskEmail(s.user.email), resendInSeconds: 60 });
  }),

  http.post(`${A}/change-email`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request);
    if (!s) return error(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
    if (s.user.emailVerified) return error(409, "EMAIL_LOCKED", "Verified emails are changed from Security.");
    const { data, fail } = await parse(request, ChangeEmailInput);
    if (fail) return fail;
    if (findUserByEmail(data.email))
      return error(409, "EMAIL_TAKEN", "An account with this email already exists.");
    s.user.email = data.email;
    return json({ user: publicUser(s.user), sentTo: maskEmail(data.email), resendInSeconds: 60 });
  }),

  http.post(`${A}/password/forgot`, async ({ request }) => {
    await mockLatency();
    const { data, fail } = await parse(request, ForgotPasswordInput);
    if (fail) return fail;
    // Always succeed so the endpoint can't be used to discover registered emails.
    const flowId = newId("reset");
    db().flows.set(flowId, { email: data.email, purpose: "reset" });
    return json({ flowId, expiresInMinutes: 10 });
  }),

  http.post(`${A}/password/reset`, async ({ request }) => {
    await mockLatency();
    const body = (await request.json().catch(() => ({}))) as {
      flowId?: string;
      code?: string;
      password?: string;
    };
    const flow = body.flowId ? db().flows.get(body.flowId) : undefined;
    if (!flow || flow.purpose !== "reset") return error(410, "FLOW_EXPIRED", "This reset link has expired.");
    if (body.code !== DEMO_CODE) return error(400, "CODE_INVALID", "That code is incorrect or expired.");
    const user = findUserByEmail(flow.email);
    if (user && body.password) user.password = body.password;
    db().flows.delete(body.flowId!);
    return json({ ok: true });
  }),

  http.post(`${A}/email-code/start`, async ({ request }) => {
    await mockLatency();
    const { data, fail } = await parse(request, EmailCodeStartInput);
    if (fail) return fail;
    const flowId = newId("ecode");
    db().flows.set(flowId, { email: data.email, purpose: "email-code" });
    return json({ flowId, sentTo: maskEmail(data.email), resendInSeconds: 60 });
  }),

  http.post(`${A}/email-code/verify`, async ({ request }) => {
    await mockLatency();
    const body = (await request.json().catch(() => ({}))) as { flowId?: string; code?: string };
    const parsed = EmailCodeVerifyInput.safeParse(body);
    const flow = body.flowId ? db().flows.get(body.flowId) : undefined;
    if (!flow || flow.purpose !== "email-code") return error(410, "FLOW_EXPIRED", "This code has expired.");
    if (!parsed.success || body.code !== DEMO_CODE) {
      return error(400, "CODE_INVALID", "That code is incorrect or expired.");
    }
    const user = findUserByEmail(flow.email);
    if (!user) return error(400, "CODE_INVALID", "That code is incorrect or expired.");
    db().flows.delete(body.flowId!);
    return json(openSession(user.id, user.twoFactorEnabled));
  }),

  http.post(`${A}/qr/start`, async () => {
    await mockLatency();
    const id = newId("qr");
    db().qr.set(id, { createdAt: Date.now(), approved: false });
    return json({ qrId: id, payload: `winprofx://login?qr=${id}`, expiresInSeconds: 60 });
  }),

  http.get(`${A}/qr/:id`, async ({ params }) => {
    const id = String(params.id);
    const entry = db().qr.get(id);
    if (!entry || Date.now() - entry.createdAt > 60_000) return json({ status: "expired" });
    if (!entry.approved) return json({ status: "pending" });
    db().qr.delete(id);
    const user = findUserByEmail("verified@winprofx.test")!;
    return json({ status: "approved", ...openSession(user.id, false) });
  }),

  /** Mock only: stands in for the WinproFX app scanning and approving the code. */
  http.post(`${A}/qr/:id/approve`, async ({ params }) => {
    const entry = db().qr.get(String(params.id));
    if (!entry) return error(404, "NOT_FOUND", "Unknown QR code.");
    entry.approved = true;
    return json({ ok: true });
  }),

  /** OAuth (Google, Telegram): the mock signs in the verified persona. */
  http.post(`${A}/oauth/:provider`, async () => {
    await mockLatency();
    const user = findUserByEmail("verified@winprofx.test")!;
    return json(openSession(user.id, user.twoFactorEnabled));
  }),

  http.post(`${A}/logout`, async ({ request }) => {
    const token = bearer(request);
    if (token) db().sessions.delete(token);
    return json({ ok: true });
  }),
];

export function maskEmail(value: string): string {
  const [name = "", domain = ""] = value.split("@");
  return `${name.slice(0, 1)}${"•".repeat(Math.max(2, name.length - 1))}@${domain}`;
}
