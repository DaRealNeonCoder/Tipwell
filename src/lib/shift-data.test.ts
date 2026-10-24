import { describe, expect, it } from "vitest";
import { calculateShiftTotals, shiftsToCsv } from "./shift-data";
import { parseHoursToX100, parseNonNegativeCents } from "./shift-schema";

describe("shift data boundaries", () => {
  it("converts money and decimal hours to safe integer storage values", () => {
    expect(parseNonNegativeCents("$1,234.567", "Sales")).toBe(123457);
    expect(parseHoursToX100("8.125")).toBe(813);
    expect(parseHoursToX100("1.004")).toBe(100);
    expect(() => parseHoursToX100("8 hours")).toThrow();
  });

  it("keeps service charge separate while calculating real hourly pay", () => {
    const totals = calculateShiftTotals([{
      date: "2026-01-02",
      hoursX100: 800,
      baseWageCents: 1500,
      salesCents: 10000,
      cashTipsCents: 2000,
      cardTipsCents: 3000,
       tipOutCents: 500,
       cardTipFeeCents: 0,
       serviceChargeShareCents: 1000,
       prepMinutes: 0,
    }]);
    expect(totals.cashTipsCents).toBe(2000);
    expect(totals.cardTipsCents).toBe(3000);
    expect(totals.tipOutCents).toBe(500);
    expect(totals.serviceChargeShareCents).toBe(1000);
    expect(totals.totalCompensationCents).toBe(17_500);
    expect(totals.averageRealHourlyRateCents).toBe(2188);
  });

  it("counts prep time in the honest hourly-rate denominator", () => {
    const totals = calculateShiftTotals([{
      date: "2026-01-02",
      hoursX100: 800,
      baseWageCents: 1500,
      salesCents: null,
      cashTipsCents: 0,
      cardTipsCents: 8000,
      tipOutCents: 0,
      cardTipFeeCents: 0,
      serviceChargeShareCents: 0,
      prepMinutes: 60,
    }]);
    expect(totals.hoursX100).toBe(900);
    expect(totals.prepMinutes).toBe(60);
    expect(totals.averageRealHourlyRateCents).toBe(2222);
  });

  it("quotes CSV values and emits service charge as its own column", () => {
    const csv = shiftsToCsv([{
      date: "2026-01-02",
      workplaceName: "A, Place",
      hoursX100: 800,
      baseWageCents: 1500,
      salesCents: null,
      cashTipsCents: 2000,
      cardTipsCents: 3000,
       tipOutCents: 500,
       cardTipFeeCents: 0,
       serviceChargeShareCents: 1000,
       prepMinutes: 0,
      notes: "closed, late",
    }]);
    expect(csv.split("\r\n")[0]).toContain("cashTips,cardTips,tipOut,cardTipFee,serviceChargeShare,notes");
    expect(csv).toContain('"A, Place"');
    expect(csv).toContain(',10.00,"closed, late"');
  });
});
