import { describe, it, expect } from "vitest";
import { timeAgo } from "./time-ago";

const BASE = new Date("2026-07-21T12:00:00.000Z").getTime();

describe("timeAgo", () => {
  it("returns 'الآن' for anything under a minute", () => {
    expect(timeAgo(new Date(BASE).toISOString(), BASE)).toBe("الآن");
    expect(timeAgo(new Date(BASE - 59_000).toISOString(), BASE)).toBe("الآن");
  });

  it("formats minutes", () => {
    expect(timeAgo(new Date(BASE - 5 * 60_000).toISOString(), BASE)).toBe("قبل 5 د");
    expect(timeAgo(new Date(BASE - 59 * 60_000).toISOString(), BASE)).toBe("قبل 59 د");
  });

  it("formats hours", () => {
    expect(timeAgo(new Date(BASE - 3 * 3_600_000).toISOString(), BASE)).toBe("قبل 3 س");
    expect(timeAgo(new Date(BASE - 23 * 3_600_000).toISOString(), BASE)).toBe("قبل 23 س");
  });

  it("formats days", () => {
    expect(timeAgo(new Date(BASE - 2 * 86_400_000).toISOString(), BASE)).toBe("قبل 2 يوم");
  });

  it("never returns a negative duration for future timestamps", () => {
    expect(timeAgo(new Date(BASE + 60_000).toISOString(), BASE)).toBe("الآن");
  });
});
