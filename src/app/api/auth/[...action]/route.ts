import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";
import {
  ChangeEmailInput,
  EmailCodeStartInput,
  EmailCodeVerifyInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  TwoFactorInput,
  VerifyEmailInput,
  type AuthResult,
  type User,
} from "@/lib/api/schemas";
import { RESET_COOKIE, safeNext } from "@/lib/auth/session";
import {
  backend,
  checkCsrf,
  clearSession,
  errorResponse,
  forwardHeaders,
  readSession,
  writeSession,
} from "@/lib/bff/server";

/**
 * Auth BFF. One dispatcher keeps cookie handling in one place.
 * Every input is Zod-validated here as well as in the form (§9).
 */

type Ctx = { params: Promise<{ action: string[] }> };
const IS_PROD = process.env.NODE_ENV === "production";
const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

async function body<S extends ZodType>(req: NextRequest, schema: S) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (parsed.success) return { data: parsed.data as S["_output"], fail: null };
  const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
  return {
    data: null,
    fail: NextResponse.json(
      { code: "VALIDATION", message: "Some fields need attention.", fields },
      { status: 422 },
    ),
  };
}

function relay(res: { status: number; body: unknown }) {
  return NextResponse.json(res.body, { status: res.status });
}

/** Sends the next step to the client; the cookie carries the session. Never the token. */
async function sessionResponse(result: AuthResult, remember: boolean, next?: string | null) {
  const step = result.mfaRequired ? "2fa" : !result.user.emailVerified ? "verify-email" : "done";
  const res = NextResponse.json({ step, next: safeNext(next) });
  await writeSession(res, result, remember);
  return res;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const csrf = checkCsrf(req);
  if (csrf) return csrf;
  const action = (await params).action.join("/");
  const headers = forwardHeaders(req);
  const next = req.nextUrl.searchParams.get("next");
  const session = await readSession(req);

  switch (action) {
    case "login": {
      const { data, fail } = await body(req, LoginInput);
      if (fail) return fail;
      const res = await backend<AuthResult>("/auth/login", { method: "POST", body: data, headers });
      return res.ok ? sessionResponse(res.body, data.remember, next) : relay(res);
    }

    case "register": {
      const { data, fail } = await body(req, RegisterInput);
      if (fail) return fail;
      const res = await backend<AuthResult>("/auth/register", { method: "POST", body: data, headers });
      return res.ok ? sessionResponse(res.body, false, next) : relay(res);
    }

    case "2fa": {
      if (!session) return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
      const { data, fail } = await body(req, TwoFactorInput);
      if (fail) return fail;
      const res = await backend<AuthResult>("/auth/2fa", {
        method: "POST",
        body: data,
        token: session.token,
        headers,
      });
      // "Trust this device" is enforced by the backend (device cookie/fingerprint); we keep the session lifetime.
      return res.ok ? sessionResponse(res.body, session.rem, next) : relay(res);
    }

    case "2fa/email-code": {
      if (!session) return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
      return relay(await backend("/auth/2fa/email-code", { method: "POST", token: session.token, headers }));
    }

    case "verify-email": {
      if (!session) return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
      const { data, fail } = await body(req, VerifyEmailInput);
      if (fail) return fail;
      const res = await backend<{ user: User }>("/auth/verify-email", {
        method: "POST",
        body: data,
        token: session.token,
        headers,
      });
      if (!res.ok) return relay(res);
      return sessionResponse(
        { token: session.token, mfaRequired: false, user: res.body.user },
        session.rem,
        next,
      );
    }

    case "verify-email/resend": {
      if (!session) return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
      return relay(
        await backend("/auth/verify-email/resend", { method: "POST", token: session.token, headers }),
      );
    }

    case "change-email": {
      if (!session) return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
      const { data, fail } = await body(req, ChangeEmailInput);
      if (fail) return fail;
      return relay(
        await backend("/auth/change-email", { method: "POST", body: data, token: session.token, headers }),
      );
    }

    case "password/forgot": {
      const { data, fail } = await body(req, ForgotPasswordInput);
      if (fail) return fail;
      const res = await backend<{ flowId: string; expiresInMinutes: number }>("/auth/password/forgot", {
        method: "POST",
        body: data,
        headers,
      });
      if (!res.ok) return relay(res);
      // The flow id stays in an httpOnly cookie, so no email or token ends up in the URL (§9).
      const out = NextResponse.json({ expiresInMinutes: res.body.expiresInMinutes });
      out.cookies.set(RESET_COOKIE, res.body.flowId, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });
      return out;
    }

    case "password/reset": {
      const flowId = req.cookies.get(RESET_COOKIE)?.value;
      if (!flowId) return errorResponse(410, "FLOW_EXPIRED", "This reset request has expired.");
      const { data, fail } = await body(req, ResetPasswordInput);
      if (fail) return fail;
      const res = await backend("/auth/password/reset", {
        method: "POST",
        body: { flowId, code: data.code, password: data.password },
        headers,
      });
      const out = relay(res);
      if (res.ok) out.cookies.set(RESET_COOKIE, "", { path: "/", maxAge: 0 });
      return out;
    }

    case "email-code/start": {
      const { data, fail } = await body(req, EmailCodeStartInput);
      if (fail) return fail;
      const res = await backend<{ flowId: string; sentTo: string; resendInSeconds: number }>(
        "/auth/email-code/start",
        { method: "POST", body: data, headers },
      );
      if (!res.ok) return relay(res);
      const out = NextResponse.json({ sentTo: res.body.sentTo, resendInSeconds: res.body.resendInSeconds });
      out.cookies.set(RESET_COOKIE, res.body.flowId, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });
      return out;
    }

    case "email-code/verify": {
      const flowId = req.cookies.get(RESET_COOKIE)?.value;
      if (!flowId) return errorResponse(410, "FLOW_EXPIRED", "This code has expired. Request a new one.");
      const { data, fail } = await body(req, EmailCodeVerifyInput);
      if (fail) return fail;
      const res = await backend<AuthResult>("/auth/email-code/verify", {
        method: "POST",
        body: { flowId, code: data.code },
        headers,
      });
      if (!res.ok) return relay(res);
      const out = await sessionResponse(res.body, false, next);
      out.cookies.set(RESET_COOKIE, "", { path: "/", maxAge: 0 });
      return out;
    }

    case "qr/start":
      return relay(await backend("/auth/qr/start", { method: "POST", headers }));

    case "logout": {
      if (session) await backend("/auth/logout", { method: "POST", token: session.token });
      const res = NextResponse.json({ ok: true });
      clearSession(res);
      return res;
    }

    default: {
      // Mock only: simulate the mobile app approving a QR code.
      const approve = action.match(/^qr\/([\w-]+)\/approve$/);
      if (approve && MOCKING)
        return relay(await backend(`/auth/qr/${approve[1]}/approve`, { method: "POST" }));
      return errorResponse(404, "NOT_FOUND", "Unknown action.");
    }
  }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const action = (await params).action.join("/");
  const next = req.nextUrl.searchParams.get("next");

  // Polled by the QR sign-in screen.
  const qr = action.match(/^qr\/([\w-]+)$/);
  if (qr) {
    const res = await backend<{ status: string } & Partial<AuthResult>>(`/auth/qr/${qr[1]}`);
    if (res.body.status === "approved" && res.body.token && res.body.user) {
      return sessionResponse(res.body as AuthResult, false, next);
    }
    return NextResponse.json({ status: res.body.status ?? "expired" });
  }

  // OAuth start: Google / Telegram. The real backend returns a provider URL;
  // in mock mode we sign in the demo persona and come straight back.
  const oauth = action.match(/^oauth\/(google|telegram)$/);
  if (oauth) {
    const res = await backend<AuthResult & { redirectUrl?: string }>(`/auth/oauth/${oauth[1]}`, {
      method: "POST",
    });
    if (!res.ok) return NextResponse.redirect(new URL(`/login?error=oauth`, req.url));
    if (res.body.redirectUrl) return NextResponse.redirect(res.body.redirectUrl);
    const step = res.body.mfaRequired
      ? "/2fa"
      : !res.body.user.emailVerified
        ? "/verify-email"
        : safeNext(next);
    const out = NextResponse.redirect(new URL(step, req.url));
    await writeSession(out, res.body, false);
    return out;
  }

  // The backend no longer knows this session (expired or revoked).
  if (action === "session-expired") {
    const out = NextResponse.redirect(
      new URL(`/login?expired=1&next=${encodeURIComponent(safeNext(next))}`, req.url),
    );
    clearSession(out);
    return out;
  }

  return errorResponse(404, "NOT_FOUND", "Unknown action.");
}
