import { describe, it, expect } from "vitest";
import {
  isOffline,
  isLowBattery,
  minutesSince,
  OFFLINE_THRESHOLD_MINUTES,
  LOW_BATTERY_THRESHOLD,
} from "./iot-watchdog-logic";

const NOW = new Date("2026-07-22T12:00:00.000Z").getTime();

describe("minutesSince", () => {
  it("computes elapsed minutes", () => {
    expect(minutesSince(new Date(NOW - 10 * 60_000).toISOString(), NOW)).toBe(10);
  });
});

describe("isOffline", () => {
  it("treats a never-reported device (null timestamp) as offline", () => {
    expect(isOffline(null)).toBe(true);
  });

  it("is not offline just under the threshold", () => {
    const justUnder = new Date(NOW - (OFFLINE_THRESHOLD_MINUTES - 1) * 60_000).toISOString();
    expect(isOffline(justUnder, NOW)).toBe(false);
  });

  it("is offline exactly at the threshold", () => {
    const atThreshold = new Date(NOW - OFFLINE_THRESHOLD_MINUTES * 60_000).toISOString();
    expect(isOffline(atThreshold, NOW)).toBe(true);
  });

  it("is offline well past the threshold", () => {
    const wayPast = new Date(NOW - 3 * 60 * 60_000).toISOString();
    expect(isOffline(wayPast, NOW)).toBe(true);
  });

  it("is not offline for a very recent reading", () => {
    const justNow = new Date(NOW - 60_000).toISOString();
    expect(isOffline(justNow, NOW)).toBe(false);
  });
});

describe("isLowBattery", () => {
  it("treats a missing reading as not low (unknown, not low)", () => {
    expect(isLowBattery(null)).toBe(false);
    expect(isLowBattery(undefined)).toBe(false);
  });

  it("flags anything under the threshold", () => {
    expect(isLowBattery(LOW_BATTERY_THRESHOLD - 1)).toBe(true);
    expect(isLowBattery(0)).toBe(true);
  });

  it("does not flag the threshold value itself or above", () => {
    expect(isLowBattery(LOW_BATTERY_THRESHOLD)).toBe(false);
    expect(isLowBattery(100)).toBe(false);
  });
});
