import { roundHalfUp } from "./calc";

export type ShiftLike = {
  date: string;
  hoursX100: number;
  baseWageCents: number;
  salesCents: number | null;
  cashTipsCents: number;
  cardTipsCents: number;
  tipOutCents: number;
  serviceChargeShareCents: number;
  notes?: string | null;
  workplaceName?: string | null;
};

export type ShiftTotals = {
  hoursX100: number;
  baseWagesCents: number;
  salesCents: number;
  cashTipsCents: number;
  cardTipsCents: number;
  tipOutCents: number;
  serviceChargeShareCents: number;
  totalTipsCents: number;
  netTipsCents: number;
  totalCompensationCents: number;
  averageRealHourlyRateCents: number | null;
};

export function calculateShiftTotals(shifts: readonly ShiftLike[]): ShiftTotals {
  const result = shifts.reduce<ShiftTotals>((totals, shift) => {
    const wages = roundHalfUp((shift.baseWageCents * shift.hoursX100) / 100);
    totals.hoursX100 += shift.hoursX100;
    totals.baseWagesCents += wages;
    totals.salesCents += shift.salesCents ?? 0;
    totals.cashTipsCents += shift.cashTipsCents;
    totals.cardTipsCents += shift.cardTipsCents;
    totals.tipOutCents += shift.tipOutCents;
    totals.serviceChargeShareCents += shift.serviceChargeShareCents;
    return totals;
  }, {
    hoursX100: 0,
    baseWagesCents: 0,
    salesCents: 0,
    cashTipsCents: 0,
    cardTipsCents: 0,
    tipOutCents: 0,
    serviceChargeShareCents: 0,
    totalTipsCents: 0,
    netTipsCents: 0,
    totalCompensationCents: 0,
    averageRealHourlyRateCents: null,
  });
  result.totalTipsCents = result.cashTipsCents + result.cardTipsCents;
  result.netTipsCents = result.totalTipsCents - result.tipOutCents;
  result.totalCompensationCents = result.baseWagesCents + result.netTipsCents + result.serviceChargeShareCents;
  result.averageRealHourlyRateCents = result.hoursX100 > 0
    ? roundHalfUp((result.totalCompensationCents * 100) / result.hoursX100)
    : null;
  return result;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function dollars(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);
}

export function shiftsToCsv(shifts: readonly ShiftLike[]): string {
  const header = ["date", "workplace", "hours", "baseWage", "sales", "cashTips", "cardTips", "tipOut", "serviceChargeShare", "notes"];
  const rows = shifts.map((shift) => [
    shift.date,
    shift.workplaceName ?? "",
    (shift.hoursX100 / 100).toFixed(2),
    dollars(shift.baseWageCents),
    dollars(shift.salesCents),
    dollars(shift.cashTipsCents),
    dollars(shift.cardTipsCents),
    dollars(shift.tipOutCents),
    dollars(shift.serviceChargeShareCents),
    shift.notes ?? "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
