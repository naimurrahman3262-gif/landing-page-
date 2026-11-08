import { describe, expect, it } from "vitest";
import { funnelViolations, shareLinks } from "@/lib/referrals";

const ok = { clicks: 100, registered: 20, kycApproved: 10, webinar: 10, eligible: 3, rewarded: 1 };

describe("referral funnel", () => {
  it("accepts a monotonic funnel (equal counts are fine)", () => {
    expect(funnelViolations(ok)).toEqual([]);
  });
  it("flags any stage larger than the one before it", () => {
    expect(funnelViolations({ ...ok, webinar: 12 })).toEqual(["webinar (12) > kycApproved (10)"]);
  });
  it("encodes share links", () => {
    const s = shareLinks("https://x.test/r?a=1&b=2", "Join me");
    expect(s.telegram).toBe(
      "https://t.me/share/url?url=https%3A%2F%2Fx.test%2Fr%3Fa%3D1%26b%3D2&text=Join%20me",
    );
    expect(s.email.startsWith("mailto:?subject=Join%20me&body=")).toBe(true);
  });
});
