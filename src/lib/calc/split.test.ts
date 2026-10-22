import { describe, expect, it } from "vitest";
import { splitEvenly } from "./split";
import { sumCents } from "./money";

describe("even split", () => {
  it("returns an exact equal split when cents divide evenly", () => {
    expect(splitEvenly(1_200, 4)).toEqual([300, 300, 300, 300]);
  });

  it("assigns indivisible leftover cents while preserving the total", () => {
    const shares = splitEvenly(100, 3);
    expect(shares).toEqual([34, 33, 33]);
    expect(sumCents(shares)).toBe(100);
  });
});
