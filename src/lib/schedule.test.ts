import { describe, expect, it } from "vitest";
import { isWithinActiveHours, parseClock, shouldProcessPosition } from "./schedule";

function at(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

describe("parseClock", () => {
  it("parses HH:MM into minutes of day", () => {
    expect(parseClock("08:30")).toBe(510);
    expect(parseClock("22:00")).toBe(1320);
  });

  it("falls back to 00:00 on malformed input and clamps out-of-range values", () => {
    expect(parseClock("oops")).toBe(0);
    expect(parseClock("25:70")).toBe(23 * 60 + 59);
  });
});

describe("isWithinActiveHours", () => {
  it("accepts times inside a normal window", () => {
    expect(isWithinActiveHours(at(9, 0), "08:00", "22:00")).toBe(true);
    expect(isWithinActiveHours(at(21, 59), "08:00", "22:00")).toBe(true);
  });

  it("rejects times at the boundaries of a normal window", () => {
    expect(isWithinActiveHours(at(7, 59), "08:00", "22:00")).toBe(false);
    expect(isWithinActiveHours(at(22, 0), "08:00", "22:00")).toBe(false);
  });

  it("supports windows that wrap midnight", () => {
    expect(isWithinActiveHours(at(23, 30), "22:00", "06:00")).toBe(true);
    expect(isWithinActiveHours(at(5, 59), "22:00", "06:00")).toBe(true);
    expect(isWithinActiveHours(at(6, 0), "22:00", "06:00")).toBe(false);
    expect(isWithinActiveHours(at(21, 59), "22:00", "06:00")).toBe(false);
  });

  it("treats equal start and end as always active", () => {
    expect(isWithinActiveHours(at(3, 15), "08:00", "08:00")).toBe(true);
    expect(isWithinActiveHours(at(23, 45), "08:00", "08:00")).toBe(true);
  });
});

describe("shouldProcessPosition", () => {
  it("always processes the first fix", () => {
    expect(shouldProcessPosition(1_000, null, 30)).toBe(true);
  });

  it("waits until the interval has fully elapsed", () => {
    const minute = 60_000;
    expect(shouldProcessPosition(10 * minute, 0, 15)).toBe(false);
    expect(shouldProcessPosition(15 * minute, 0, 15)).toBe(true);
    expect(shouldProcessPosition(90 * minute + 1, 0, 90)).toBe(true);
  });

  it("never blocks on a zero or negative interval", () => {
    expect(shouldProcessPosition(500, 1_000, 0)).toBe(true);
  });
});
