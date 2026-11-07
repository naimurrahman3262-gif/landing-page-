/** Starts the MSW Node server when mocking is enabled, so the BFF talks to the mock backend. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
    const { server } = await import("./mocks/node");
    server.listen({ onUnhandledRequest: "bypass" });
    console.info("[msw] mock backend enabled");
  }
}
