import { http, HttpResponse } from "msw";
import { BACKEND_URL, forcedError, mockLatency } from "../utils";

export const systemHandlers = [
  http.get(`${BACKEND_URL}/health`, async ({ request }) => {
    await mockLatency();
    const error = forcedError(request, "health");
    if (error) return error;
    return HttpResponse.json({ status: "ok", serverTime: new Date().toISOString(), source: "mock" });
  }),
];
