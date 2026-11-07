import { describe, expect, it } from "vitest";
import { rangeToInstants } from "@/lib/dates";

describe("rangeToInstants: the user's local day (old bug: 'Today' showed yesterday)", () => {
  // 00:30 on 7 Nov in Dhaka (GMT+6) is still 6 Nov in UTC.
  const now = new Date("2026-11-06T18:30:00Z");

  it("Today starts at local midnight, not UTC midnight", () => {
    expect(rangeToInstants({ preset: "today" }, "Asia/Dhaka", now)).toEqual({
      from: "2026-11-06T18:00:00.000Z",
      to: "2026-11-07T17:59:59.999Z",
    });
  });

  it("7D and 30D include today", () => {
    expect(rangeToInstants({ preset: "7d" }, "Asia/Dhaka", now).from).toBe("2026-10-31T18:00:00.000Z");
    expect(rangeToInstants({ preset: "30d" }, "Asia/Dhaka", now).from).toBe("2026-10-08T18:00:00.000Z");
  });

  it("This month starts on the 1st, local time", () => {
    expect(rangeToInstants({ preset: "month" }, "Asia/Kolkata", now).from).toBe("2026-10-31T18:30:00.000Z");
  });

  it("custom ranges are inclusive local days and survive DST changes", () => {
    expect(rangeToInstants({ from: "2026-03-07", to: "2026-03-09" }, "America/New_York", now)).toEqual({
      from: "2026-03-07T05:00:00.000Z",
      to: "2026-03-10T03:59:59.999Z", // 9 Mar is after the DST switch (UTC−4)
    });
  });

  it("all time has no bounds", () => {
    expect(rangeToInstants({ preset: "all" }, "UTC", now)).toEqual({ from: null, to: null });
  });
});
