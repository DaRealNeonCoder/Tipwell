import { asCents, type Cents } from "./money";

function validateSplit(totalCents: Cents, people: number): void {
  asCents(totalCents);
  if (totalCents < 0) {
    throw new RangeError("Cannot split a negative amount");
  }
  if (!Number.isInteger(people) || people <= 0) {
    throw new RangeError("people must be a positive integer");
  }
}

/**
 * Split cents as evenly as possible. Earlier positions receive the leftover
 * cents, so the returned values always sum exactly to totalCents.
 */
export function splitEvenly(totalCents: Cents, people: number): Cents[] {
  validateSplit(totalCents, people);
  const share = Math.floor(totalCents / people);
  const leftovers = totalCents % people;
  return Array.from({ length: people }, (_, index) => share + (index < leftovers ? 1 : 0));
}

export const evenSplit = splitEvenly;
