import { describe, expect, it } from "vitest";
import { calculateCashOut, calculateCardTipFeeCents, groupTipStats } from "./worker-insights";

describe("worker insights", () => {
  it("groups table tips into section-level averages", () => {
    const stats = groupTipStats([
      { id: "1", date: "2026-10-24", section: "Section 4", daypart: "Dinner", partySize: 2, checkCents: 10000, tipCents: 2200, menuCategory: "Dinner", turnMinutes: 60 },
      { id: "2", date: "2026-10-24", section: "Section 2", daypart: "Dinner", partySize: 4, checkCents: 10000, tipCents: 1600, menuCategory: "Dinner", turnMinutes: 75 },
    ], "section");
    expect(stats[0]).toMatchObject({ key: "Section 4", tipPercent: 22, covers: 2 });
    expect(stats[1]).toMatchObject({ key: "Section 2", tipPercent: 16, averageTurnMinutes: 75 });
  });

  it("reconciles cash owed and card processing fees", () => {
    expect(calculateCardTipFeeCents(10000, 3)).toBe(300);
    expect(calculateCashOut({ cashSalesCents: 5000, cashTipsCents: 1200, cardTipsCents: 8000, tipOutCents: 500, cardTipFeeCents: 240, actualCashOwedCents: 4300 })).toEqual({
      expectedCashOwedCents: 4300,
      netTipsCents: 8460,
      finalTakeHomeCents: 8460,
      varianceCents: 0,
    });
  });
});
