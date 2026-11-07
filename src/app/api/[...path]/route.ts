import { NextResponse, type NextRequest } from "next/server";
import { backend, checkCsrf, errorResponse, forwardHeaders, readSession } from "@/lib/bff/server";
import { schemaFor } from "@/lib/bff/validation";

/**
 * Authenticated BFF proxy: /api/<path> → backend /<path> with the session
 * token from the httpOnly cookie. Mutations need a CSRF token, and known
 * mutations are Zod-validated here before they reach the backend.
 */
type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, { params }: Ctx) {
  const csrf = checkCsrf(req);
  if (csrf) return csrf;
  const session = await readSession(req);
  if (!session || session.mfa) {
    return errorResponse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
  }

  const segments = (await params).path;
  const path = segments.map(encodeURIComponent).join("/");
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body: unknown = hasBody ? await req.json().catch(() => undefined) : undefined;

  const schema = hasBody ? schemaFor(req.method, segments.join("/")) : undefined;
  if (schema) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
      return NextResponse.json(
        { code: "VALIDATION", message: "Some fields need attention.", fields },
        { status: 422 },
      );
    }
  }

  const res = await backend(`/${path}${req.nextUrl.search}`, {
    method: req.method,
    token: session.token,
    headers: forwardHeaders(req),
    body,
  });
  return NextResponse.json(res.body, { status: res.status });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
