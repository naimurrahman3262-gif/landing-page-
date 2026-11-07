import { NextResponse, type NextRequest } from "next/server";
import { backend, checkCsrf, errorResponse, forwardHeaders, readSession } from "@/lib/bff/server";

/**
 * Authenticated BFF proxy: /api/<path> → backend /<path> with the session
 * token from the httpOnly cookie. Mutations need a CSRF token.
 * Domain-specific route handlers (with BFF-side Zod validation) take
 * priority over this catch-all as they are added.
 */
type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, { params }: Ctx) {
  const csrf = checkCsrf(req);
  if (csrf) return csrf;
  const session = await readSession(req);
  if (!session || session.mfa)
    return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");

  const path = (await params).path.map(encodeURIComponent).join("/");
  const search = req.nextUrl.search;
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const res = await backend(`/${path}${search}`, {
    method: req.method,
    token: session.token,
    headers: forwardHeaders(req),
    body: hasBody ? await req.json().catch(() => undefined) : undefined,
  });
  return NextResponse.json(res.body, { status: res.status });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
