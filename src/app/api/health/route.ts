import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://backend.mock.winprofx.local";

/** BFF health check: proxies to the backend (mocked by MSW in dev). */
export async function GET(request: NextRequest) {
  const mockError = request.nextUrl.searchParams.get("mockError");
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      cache: "no-store",
      headers: mockError ? { "x-mock-error": mockError } : undefined,
    });
    const body: unknown = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { code: "BACKEND_UNREACHABLE", message: "The backend could not be reached." },
      { status: 502 },
    );
  }
}
