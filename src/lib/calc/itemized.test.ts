import { describe, expect, it } from "vitest";
import { calculateItemizedSplit } from "./itemized";

describe("itemized split", () => {
  it("splits shared dishes and allocates tip proportionally", () => {
    const result = calculateItemizedSplit({
      people: 2,
      tipPercent: 20,
      items: [
        { name: "Burger", priceCents: 1_000, personIds: [0] },
        { name: "Fries", priceCents: 600, personIds: [0, 1] },
      ],
    });
    expect(result.subtotalCents).toBe(1_600);
    expect(result.tipCents).toBe(320);
    expect(result.perPersonSubtotalCents).toEqual([1_300, 300]);
    expect(result.perPersonTotalCents).toEqual([1_560, 360]);
  });

  it("keeps every cent accounted for", () => {
    const result = calculateItemizedSplit({ people: 3, tipPercent: 18, items: [{ name: "Shared", priceCents: 1, personIds: [0, 1, 2] }] });
    expect(result.perPersonSubtotalCents.reduce((sum, value) => sum + value, 0)).toBe(result.subtotalCents);
    expect(result.perPersonTotalCents.reduce((sum, value) => sum + value, 0)).toBe(result.totalCents);
  });
});
