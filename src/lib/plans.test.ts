import { describe, it, expect } from "vitest";
import { PLAN_INFO, PLAN_IDS } from "./plans";

describe("plans", () => {
  it("has an info entry for every plan id, and vice versa", () => {
    expect(PLAN_IDS.sort()).toEqual(Object.keys(PLAN_INFO).sort());
  });

  it("prices and coverage increase with each tier (hares < raee < amir)", () => {
    expect(PLAN_INFO.hares.monthlyPrice).toBeLessThan(PLAN_INFO.raee.monthlyPrice);
    expect(PLAN_INFO.raee.monthlyPrice).toBeLessThan(PLAN_INFO.amir.monthlyPrice);
    expect(PLAN_INFO.hares.coverageAmount).toBeLessThan(PLAN_INFO.raee.coverageAmount);
    expect(PLAN_INFO.raee.coverageAmount).toBeLessThan(PLAN_INFO.amir.coverageAmount);
  });

  it("has positive prices and coverage for every plan", () => {
    for (const id of PLAN_IDS) {
      expect(PLAN_INFO[id].monthlyPrice).toBeGreaterThan(0);
      expect(PLAN_INFO[id].coverageAmount).toBeGreaterThan(0);
    }
  });
});
