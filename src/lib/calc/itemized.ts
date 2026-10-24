import { asCents, percentageOfCents, type Cents } from "./money";

export type ItemizedItem = {
  name: string;
  priceCents: Cents;
  personIds: number[];
};

export type ItemizedSplitInput = {
  people: number;
  items: ItemizedItem[];
  tipPercent: number;
};

export type ItemizedSplitResult = {
  subtotalCents: Cents;
  tipCents: Cents;
  totalCents: Cents;
  perPersonSubtotalCents: Cents[];
  perPersonTipCents: Cents[];
  perPersonTotalCents: Cents[];
};

function allocateWeighted(totalCents: Cents, weights: number[]): Cents[] {
  asCents(totalCents);
  if (totalCents < 0 || weights.some((weight) => !Number.isFinite(weight) || weight < 0)) throw new RangeError("Weights must be non-negative");
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal === 0) return weights.map(() => 0);
  const exact = weights.map((weight) => totalCents * weight / weightTotal);
  const result = exact.map(Math.floor);
  let remaining = totalCents - result.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const entry of order) {
    if (remaining <= 0) break;
    result[entry.index] += 1;
    remaining -= 1;
  }
  return result;
}

export function calculateItemizedSplit({ people, items, tipPercent }: ItemizedSplitInput): ItemizedSplitResult {
  if (!Number.isInteger(people) || people < 1) throw new RangeError("People must be a positive integer");
  if (!Number.isFinite(tipPercent) || tipPercent < 0 || tipPercent > 100) throw new RangeError("Tip percentage must be between 0 and 100");
  if (items.length === 0) throw new RangeError("Add at least one item");

  const perPersonSubtotalCents = Array.from({ length: people }, () => 0);
  for (const item of items) {
    asCents(item.priceCents);
    if (item.priceCents < 0) throw new RangeError("Item prices cannot be negative");
    const uniquePeople = [...new Set(item.personIds)].filter((personId) => Number.isInteger(personId) && personId >= 0 && personId < people);
    if (uniquePeople.length === 0) throw new RangeError("Every item needs at least one person");
    const shares = allocateWeighted(item.priceCents, uniquePeople.map(() => 1));
    uniquePeople.forEach((personId, index) => { perPersonSubtotalCents[personId] += shares[index]; });
  }
  const subtotalCents = perPersonSubtotalCents.reduce((sum, value) => sum + value, 0);
  const tipCents = percentageOfCents(subtotalCents, tipPercent);
  const perPersonTipCents = allocateWeighted(tipCents, perPersonSubtotalCents);
  const perPersonTotalCents = perPersonSubtotalCents.map((subtotal, index) => subtotal + perPersonTipCents[index]);
  return { subtotalCents, tipCents, totalCents: subtotalCents + tipCents, perPersonSubtotalCents, perPersonTipCents, perPersonTotalCents };
}
