import { http, HttpResponse } from "msw";
import { db, publicUser } from "../store";
import { BACKEND_URL, forcedError, mockLatency } from "../utils";
import { sessionUser } from "./auth";

const unauthenticated = () =>
  HttpResponse.json(
    { code: "UNAUTHENTICATED", message: "Your session has ended. Sign in again." },
    { status: 401 },
  );

export const userHandlers = [
  http.get(`${BACKEND_URL}/me`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request, true);
    if (!s) return unauthenticated();
    return HttpResponse.json(publicUser(s.user));
  }),

  http.get(`${BACKEND_URL}/notifications`, async ({ request }) => {
    await mockLatency();
    const forced = forcedError(request, "notifications");
    if (forced) return forced;
    const s = sessionUser(request);
    if (!s) return unauthenticated();
    const items = db().notifications.get(s.user.id) ?? [];
    return HttpResponse.json({ items, unread: items.filter((n) => !n.read).length });
  }),

  http.post(`${BACKEND_URL}/notifications/read`, async ({ request }) => {
    await mockLatency();
    const s = sessionUser(request);
    if (!s) return unauthenticated();
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
    const items = db().notifications.get(s.user.id) ?? [];
    for (const n of items) if (!body.ids || body.ids.includes(n.id)) n.read = true;
    return HttpResponse.json({ items, unread: items.filter((n) => !n.read).length });
  }),
];
