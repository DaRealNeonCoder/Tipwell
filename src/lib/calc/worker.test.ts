import { describe, expect, it } from "vitest";
import {
  calculateRealHourlyRateCents,
  calculateTipOutCents,
  calculateWorkerCompensation,
  splitTipPoolLargestRemainder,
} from "./worker";
import { sumCents } from "./money";

describe("worker calculations", () => {
  it("returns a safe zero rate when a worker has zero hours", () => {
    expect(calculateRealHourlyRateCents(10_000, 4)).toBe(2_500);
    expect(calculateRealHourlyRateCents(10_000, 0)).toBe(0);
  });

  it("calculates tip-out from an explicit base and percentage", () => {
    expect(calculateTipOutCents(10_000, 5)).toBe(500);
  });

  it("calculates worker compensation in cents", () => {
    expect(
      calculateWorkerCompensation({
        hourlyRateCents: 2_000,
        hours: 4.5,
        tipsCents: 1_000,
        tipOutCents: 200,
      }),
    ).toEqual({
      wagesCents: 9_000,
      tipsCents: 1_000,
      tipOutCents: 200,
      totalCompensationCents: 9_800,
      realHourlyRateCents: 2_177.777777777778,
    });
  });

  it("uses largest remainder allocation so pool leftovers are not lost", () => {
    const shares = splitTipPoolLargestRemainder(101, [1, 2, 3]);
    expect(shares).toEqual([17, 34, 50]);
    expect(sumCents(shares)).toBe(101);
  });

  it("breaks equal largest-remainder ties by worker order", () => {
    expect(splitTipPoolLargestRemainder(10, [1, 1, 1])).toEqual([4, 3, 3]);
  });
});
