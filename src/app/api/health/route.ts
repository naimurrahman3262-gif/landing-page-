import { NextResponse, type NextRequest } from "next/server";
import { backend } from "@/lib/bff/server";

/** BFF health check: proxies to the backend (the mock handlers in mock mode). */
export async function GET(request: NextRequest) {
  const mockError = request.nextUrl.searchParams.get("mockError");
  const res = await backend("/health", { headers: mockError ? { "x-mock-error": mockError } : undefined });
  return NextResponse.json(res.body, { status: res.status });
}
