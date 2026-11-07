import { http, HttpResponse } from "msw";
import {
  ChangePasswordInput,
  KycUploadInput,
  NewTicketInput,
  Preferences,
  ProfileInput,
  TicketReplyInput,
  type Profile,
  type Ticket,
} from "@/lib/api/schemas";
import { REGIONS, validPostcode } from "@/config/regions";
import { ARTICLES } from "../fixtures/help";
import { DEMO_CODE } from "../fixtures/users";
import { accountData, db, newId, portfolio } from "../store";
import { BACKEND_URL, forcedError, mockLatency } from "../utils";
import { maskEmail, sessionUser } from "./auth";

const json = (body: unknown, status = 200) => HttpResponse.json(body as object, { status });
const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  json({ code, message, ...(fields ? { fields } : {}) }, status);

async function guard(request: Request, domain: string) {
  await mockLatency();
  const forced = forcedError(request, domain);
  if (forced) return forced;
  const s = sessionUser(request);
  return s ? s.user : fail(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
}

function consumeStepUp(request: Request, userId: string): boolean {
  const token = request.headers.get("x-step-up");
  const entry = token ? db().stepUp.get(token) : undefined;
  if (!entry || entry.userId !== userId || entry.expiresAt < Date.now()) return false;
  db().stepUp.delete(token!);
  return true;
}

async function body<T>(
  request: Request,
  schema: {
    safeParse: (v: unknown) => {
      success: boolean;
      data?: T;
      error?: { issues: { path: PropertyKey[]; message: string }[] };
    };
  },
) {
  const r = schema.safeParse(await request.json().catch(() => ({})));
  if (r.success) return { data: r.data as T, err: null };
  const fields = Object.fromEntries(r.error!.issues.map((i) => [String(i.path[0]), i.message]));
  return { data: null, err: fail(422, "VALIDATION", "Some fields need attention.", fields) };
}

const LOCKED_AFTER_KYC = ["firstName", "lastName", "dateOfBirth", "country"];

type User = Exclude<Awaited<ReturnType<typeof guard>>, Response>;

function profileOf(user: User): Profile {
  const a = accountData(user.id);
  const values = [
    user.firstName,
    user.lastName,
    a.phone,
    a.dateOfBirth,
    user.country,
    a.state,
    a.city,
    a.address,
    a.postcode,
  ];
  const filled = values.filter((v) => !!v).length + (user.emailVerified ? 1 : 0);
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: a.phone,
    dateOfBirth: a.dateOfBirth,
    country: user.country,
    state: a.state,
    city: a.city,
    address: a.address,
    postcode: a.postcode,
    locked: user.kycStatus === "verified" ? LOCKED_AFTER_KYC : [],
    completion: Math.round((filled / (values.length + 1)) * 100),
  };
}

const B = BACKEND_URL;

export const accountHandlers = [
  /* -------------------------------- profile ------------------------------- */
  http.get(`${B}/profile`, async ({ request }) => {
    const user = await guard(request, "profile");
    if (user instanceof Response) return user;
    return json(profileOf(user));
  }),

  http.patch(`${B}/profile`, async ({ request }) => {
    const user = await guard(request, "profile");
    if (user instanceof Response) return user;
    const { data, err } = await body(request, ProfileInput);
    if (err) return err;
    const v = data!;
    const current = profileOf(user);
    // Locked fields can't change server-side either (§6.10).
    for (const f of current.locked) {
      const before = (current as unknown as Record<string, unknown>)[f] ?? "";
      if (String((v as Record<string, unknown>)[f] ?? "") !== String(before)) {
        return fail(
          409,
          "FIELD_LOCKED",
          "Verified details can't be changed here. Contact support to change them.",
          { [f]: "fieldLocked" },
        );
      }
    }
    const region = REGIONS[v.country];
    if (region && v.state && !region.states.includes(v.state))
      return fail(422, "VALIDATION", "Choose a state from the list.", { state: "stateInvalid" });
    if (!validPostcode(v.country, v.postcode))
      return fail(422, "VALIDATION", "Check the postcode format.", { postcode: "postcodeInvalid" });
    const a = accountData(user.id);
    user.firstName = v.firstName;
    user.lastName = v.lastName;
    user.country = v.country;
    Object.assign(a, {
      phone: v.phone || null,
      dateOfBirth: v.dateOfBirth || null,
      state: v.state || null,
      city: v.city || null,
      address: v.address || null,
      postcode: v.postcode || null,
    });
    portfolio(user.id).profileComplete = profileOf(user).completion === 100;
    return json(profileOf(user));
  }),

  /* ---------------------------------- KYC --------------------------------- */
  http.get(`${B}/kyc`, async ({ request }) => {
    const user = await guard(request, "kyc");
    if (user instanceof Response) return user;
    const a = accountData(user.id);
    const now = Date.now();
    for (const d of a.kyc)
      if (d.status === "verified" && d.expiresAt && Date.parse(d.expiresAt) < now) d.status = "expired";
    return json({
      status: user.kycStatus,
      documents: a.kyc,
      reviewedAt: user.kycStatus === "verified" ? "2025-03-22T08:00:00Z" : null,
    });
  }),

  http.post(`${B}/kyc/documents`, async ({ request }) => {
    const user = await guard(request, "kyc");
    if (user instanceof Response) return user;
    const { data, err } = await body(request, KycUploadInput);
    if (err) return err;
    const a = accountData(user.id);
    const doc = a.kyc.find((d) => d.type === data!.type)!;
    Object.assign(doc, {
      status: "pending",
      fileName: data!.fileName,
      uploadedAt: new Date().toISOString(),
      rejectionReason: null,
      expiresAt: null,
    });
    if (
      user.kycStatus !== "verified" &&
      a.kyc.every((d) => d.status !== "missing" && d.status !== "rejected")
    ) {
      user.kycStatus = "pending";
    }
    return json({ document: doc, status: user.kycStatus }, 201);
  }),

  /* ------------------------------- security ------------------------------- */
  http.get(`${B}/security`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    const a = accountData(user.id);
    return json({ twoFactorEnabled: user.twoFactorEnabled, ...a.security });
  }),

  http.post(`${B}/security/2fa/setup`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    if (user.twoFactorEnabled) return fail(409, "ALREADY_ON", "Two-step verification is already on.");
    const secret = "JBSWY3DPEHPK3PXP"
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    accountData(user.id).pendingTotpSecret = secret;
    const label = encodeURIComponent(`WinproFX:${user.email}`);
    return json({ secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=WinproFX` });
  }),

  http.post(`${B}/security/2fa/enable`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    const a = accountData(user.id);
    const b = (await request.json().catch(() => ({}))) as { code?: string };
    if (!a.pendingTotpSecret) return fail(409, "NO_SETUP", "Start setup again.");
    if (b.code !== DEMO_CODE) return fail(400, "CODE_INVALID", "That code is incorrect or expired.");
    user.twoFactorEnabled = true;
    a.pendingTotpSecret = null;
    const codes = Array.from({ length: 10 }, () =>
      `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
    );
    a.security.backupCodesRemaining = codes.length;
    return json({ backupCodes: codes });
  }),

  /** Disabling 2FA needs step-up (§9). */
  http.post(`${B}/security/2fa/disable`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    if (!consumeStepUp(request, user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    user.twoFactorEnabled = false;
    accountData(user.id).security.backupCodesRemaining = 0;
    return json({ ok: true });
  }),

  http.post(`${B}/security/password`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    const { data, err } = await body(request, ChangePasswordInput);
    if (err) return err;
    if (data!.current !== user.password) {
      return fail(400, "CURRENT_WRONG", "Your current password is incorrect.", { current: "currentWrong" });
    }
    user.password = data!.password;
    accountData(user.id).security.passwordChangedAt = new Date().toISOString();
    return json({ ok: true });
  }),

  /** Changing email needs step-up; the new address must be confirmed before it's used. */
  http.post(`${B}/security/email`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    if (!consumeStepUp(request, user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    const b = (await request.json().catch(() => ({}))) as { email?: string };
    if (!b.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email))
      return fail(422, "VALIDATION", "Enter a valid email.", { email: "emailInvalid" });
    return json({ pendingEmail: b.email, sentTo: maskEmail(b.email) });
  }),

  http.delete(`${B}/security/sessions/:id`, async ({ request, params }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    const a = accountData(user.id);
    const s = a.security.sessions.find((x) => x.id === params.id);
    if (!s) return fail(404, "NOT_FOUND", "That session has already ended.");
    if (s.current) return fail(409, "CURRENT_SESSION", "Use Sign out to end this session.");
    a.security.sessions = a.security.sessions.filter((x) => x.id !== params.id);
    return json({ sessions: a.security.sessions });
  }),

  http.post(`${B}/security/sessions/revoke-others`, async ({ request }) => {
    const user = await guard(request, "security");
    if (user instanceof Response) return user;
    const a = accountData(user.id);
    a.security.sessions = a.security.sessions.filter((x) => x.current);
    return json({ sessions: a.security.sessions });
  }),

  /* ------------------------------ preferences ------------------------------ */
  http.get(`${B}/preferences`, async ({ request }) => {
    const user = await guard(request, "preferences");
    if (user instanceof Response) return user;
    return json(accountData(user.id).preferences);
  }),

  http.patch(`${B}/preferences`, async ({ request }) => {
    const user = await guard(request, "preferences");
    if (user instanceof Response) return user;
    const { data, err } = await body(request, Preferences);
    if (err) return err;
    accountData(user.id).preferences = data!;
    user.timeZone = data!.timeZone;
    user.locale = data!.locale;
    return json(data);
  }),

  /* -------------------------- payout methods (edit) -------------------------- */
  http.patch(`${B}/payout-methods/:id`, async ({ request, params }) => {
    const user = await guard(request, "payoutMethods");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    const pm = p.payouts.find((x) => x.id === params.id);
    if (!pm) return fail(404, "NOT_FOUND", "We couldn't find that payout method.");
    const b = (await request.json().catch(() => ({}))) as { label?: string; isDefault?: boolean };
    if (b.label !== undefined) {
      if (!b.label.trim() || b.label.length > 40)
        return fail(422, "VALIDATION", "Names are 1–40 characters.", { label: "labelRequired" });
      pm.label = b.label.trim();
    }
    if (b.isDefault) {
      if (pm.status !== "verified")
        return fail(409, "NOT_VERIFIED", "Only verified methods can be the default.");
      p.payouts.forEach((x) => (x.isDefault = x.id === pm.id));
    }
    return json({ payoutMethod: pm });
  }),

  /** Removing a payout method needs step-up (same protection as adding one). */
  http.delete(`${B}/payout-methods/:id`, async ({ request, params }) => {
    const user = await guard(request, "payoutMethods");
    if (user instanceof Response) return user;
    if (!consumeStepUp(request, user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    const p = portfolio(user.id);
    const was = p.payouts.find((x) => x.id === params.id);
    if (!was) return fail(404, "NOT_FOUND", "We couldn't find that payout method.");
    p.payouts = p.payouts.filter((x) => x.id !== params.id);
    if (was.isDefault) {
      const next = p.payouts.find((x) => x.status === "verified");
      if (next) next.isDefault = true;
    }
    return json({ ok: true });
  }),

  /* ---------------------------------- help --------------------------------- */
  http.get(`${B}/help/articles`, async ({ request }) => {
    const user = await guard(request, "help");
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim().toLowerCase();
    const cat = url.searchParams.get("category");
    const items = ARTICLES.filter(
      (a) =>
        (!cat || a.category === cat) &&
        (!q || `${a.title} ${a.summary} ${a.body.join(" ")}`.toLowerCase().includes(q)),
    );
    return json({ items });
  }),

  http.get(`${B}/help/articles/:slug`, async ({ request, params }) => {
    const user = await guard(request, "help");
    if (user instanceof Response) return user;
    const a = ARTICLES.find((x) => x.slug === params.slug);
    return a ? json(a) : fail(404, "NOT_FOUND", "We couldn't find that article.");
  }),

  /* --------------------------------- tickets -------------------------------- */
  http.get(`${B}/tickets`, async ({ request }) => {
    const user = await guard(request, "tickets");
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim().toLowerCase();
    const items = accountData(user.id)
      .tickets.filter((t) => !status || status === "all" || t.status === status)
      .filter((t) => !q || t.subject.toLowerCase().includes(q) || String(t.number).includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return json({ items });
  }),

  http.get(`${B}/tickets/:id`, async ({ request, params }) => {
    const user = await guard(request, "tickets");
    if (user instanceof Response) return user;
    const t = accountData(user.id).tickets.find((x) => x.id === params.id);
    return t ? json(t) : fail(404, "NOT_FOUND", "We couldn't find that ticket.");
  }),

  http.post(`${B}/tickets`, async ({ request }) => {
    const user = await guard(request, "tickets");
    if (user instanceof Response) return user;
    const { data, err } = await body(request, NewTicketInput);
    if (err) return err;
    const a = accountData(user.id);
    const now = new Date().toISOString();
    const number = 48200 + a.tickets.length + Math.floor(Math.random() * 50);
    const t: Ticket = {
      id: `tk_${number}`,
      number,
      subject: data!.subject,
      category: data!.category,
      status: "open",
      login: data!.login,
      transactionId: data!.transactionId,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: newId("m"),
          author: "client",
          authorName: `${user.firstName} ${user.lastName}`,
          body: data!.description,
          at: now,
          attachments: data!.attachments,
        },
      ],
    };
    a.tickets.unshift(t);
    return json(t, 201);
  }),

  http.post(`${B}/tickets/:id/messages`, async ({ request, params }) => {
    const user = await guard(request, "tickets");
    if (user instanceof Response) return user;
    const t = accountData(user.id).tickets.find((x) => x.id === params.id);
    if (!t) return fail(404, "NOT_FOUND", "We couldn't find that ticket.");
    if (t.status === "closed")
      return fail(409, "TICKET_CLOSED", "This ticket is closed. Open a new one if you still need help.");
    const { data, err } = await body(request, TicketReplyInput);
    if (err) return err;
    const now = new Date().toISOString();
    t.messages.push({
      id: newId("m"),
      author: "client",
      authorName: `${user.firstName} ${user.lastName}`,
      body: data!.body,
      at: now,
      attachments: data!.attachments,
    });
    t.status = "open";
    t.updatedAt = now;
    return json(t);
  }),

  http.post(`${B}/tickets/:id/close`, async ({ request, params }) => {
    const user = await guard(request, "tickets");
    if (user instanceof Response) return user;
    const t = accountData(user.id).tickets.find((x) => x.id === params.id);
    if (!t) return fail(404, "NOT_FOUND", "We couldn't find that ticket.");
    t.status = "closed";
    t.updatedAt = new Date().toISOString();
    return json(t);
  }),

  /** Live chat (mock): receives the user's message with page context, answers once. */
  http.post(`${B}/chat/messages`, async ({ request }) => {
    const user = await guard(request, "chat");
    if (user instanceof Response) return user;
    const b = (await request.json().catch(() => ({}))) as { body?: string; context?: { page?: string } };
    if (!b.body?.trim()) return fail(422, "VALIDATION", "Type a message first.");
    return json({
      reply: {
        id: newId("c"),
        author: "support",
        body: `Thanks, ${user.firstName}. An agent will join this chat shortly. We can see you're on ${b.context?.page ?? "the portal"}, so you don't need to explain where you are.`,
        at: new Date().toISOString(),
      },
    });
  }),
];
