import { DEMO_CODE, DEMO_PASSWORD, PERSONAS } from "@/mocks/fixtures/users";

/**
 * Mock builds only (local dev, Vercel previews with NEXT_PUBLIC_API_MOCKING):
 * shows the demo personas so reviewers can sign in. Dev tooling, not product
 * copy, so it isn't translated. Never rendered against a real backend.
 */
export function DemoPersonas() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return null;
  return (
    <aside
      aria-label="Mock sign-in details"
      className="rounded-lg border border-dashed border-border-strong p-4 text-xs text-text-2"
    >
      <p className="mb-2 font-display font-bold text-text-1">Mock backend: demo personas</p>
      <ul className="grid gap-1">
        <li>
          Verified + 2FA: <code className="text-text-1">{PERSONAS.verified}</code>
        </li>
        <li>
          New, email unverified: <code className="text-text-1">{PERSONAS.new}</code>
        </li>
        <li>
          Password <code className="text-text-1">{DEMO_PASSWORD}</code> · every code{" "}
          <code className="text-text-1">{DEMO_CODE}</code> · add <code>?mockError=login</code> to force an
          error
        </li>
      </ul>
    </aside>
  );
}
