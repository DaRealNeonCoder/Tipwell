import { percentageOfCents, roundHalfUp, sumCents, type Cents } from "./calc";

export type TableTipRecord = {
  id: string;
  date: string;
  section: string;
  daypart: string;
  partySize: number;
  checkCents: Cents;
  tipCents: Cents;
  menuCategory: string;
  turnMinutes: number | null;
};

export type TipGroupStats = {
  key: string;
  tables: number;
  covers: number;
  checkCents: Cents;
  tipCents: Cents;
  tipPercent: number | null;
  averageTipCents: Cents;
  averageTurnMinutes: number | null;
};

export function tipPercent(checkCents: Cents, tipCents: Cents): number | null {
  if (checkCents <= 0) return null;
  return roundHalfUp((tipCents * 10000) / checkCents, 2) / 100;
}

export function groupTipStats(records: readonly TableTipRecord[], field: "section" | "daypart" | "menuCategory"): TipGroupStats[] {
  const groups = new Map<string, TableTipRecord[]>();
  for (const record of records) {
    const key = record[field].trim() || "Uncategorized";
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const checkCents = sumCents(group.map((record) => record.checkCents));
      const tipCents = sumCents(group.map((record) => record.tipCents));
      const turns = group.flatMap((record) => record.turnMinutes === null ? [] : [record.turnMinutes]);
      return {
        key,
        tables: group.length,
        covers: group.reduce((total, record) => total + record.partySize, 0),
        checkCents,
        tipCents,
        tipPercent: tipPercent(checkCents, tipCents),
        averageTipCents: group.length === 0 ? 0 : roundHalfUp(tipCents / group.length),
        averageTurnMinutes: turns.length === 0 ? null : roundHalfUp(turns.reduce((total, value) => total + value, 0) / turns.length),
      } satisfies TipGroupStats;
    })
    .sort((left, right) => (right.tipPercent ?? -1) - (left.tipPercent ?? -1));
}

export type CashOutInput = {
  cashSalesCents: Cents;
  cashTipsCents: Cents;
  cardTipsCents: Cents;
  tipOutCents: Cents;
  cardTipFeeCents: Cents;
  actualCashOwedCents: Cents | null;
};

export function calculateCashOut(input: CashOutInput) {
  const expectedCashOwedCents = input.cashSalesCents - input.cashTipsCents + input.tipOutCents;
  const netTipsCents = input.cashTipsCents + input.cardTipsCents - input.tipOutCents - input.cardTipFeeCents;
  const finalTakeHomeCents = netTipsCents;
  return {
    expectedCashOwedCents,
    netTipsCents,
    finalTakeHomeCents,
    varianceCents: input.actualCashOwedCents === null ? null : input.actualCashOwedCents - expectedCashOwedCents,
  };
}

export function calculateCardTipFeeCents(cardTipsCents: Cents, feePercent: number): Cents {
  return percentageOfCents(cardTipsCents, feePercent);
}
