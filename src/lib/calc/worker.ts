import {
  asCents,
  type Cents,
  percentageOfCents,
  roundHalfUp,
  sumCents,
} from "./money";

/** Hourly compensation in cents, including tips. Zero hours returns zero. */
export function calculateRealHourlyRateCents(
  totalCompensationCents: Cents,
  hours: number,
): number {
  asCents(totalCompensationCents);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new RangeError("Hours must be a finite, non-negative number");
  }
  if (hours === 0) {
    return 0;
  }
  return totalCompensationCents / hours;
}

export const realHourlyRateCents = calculateRealHourlyRateCents;

/** Calculate a tip-out from a sales, tips, or other explicitly supplied base. */
export function calculateTipOutCents(baseCents: Cents, tipOutPercent: number): Cents {
  return percentageOfCents(baseCents, tipOutPercent);
}

export const tipOutCents = calculateTipOutCents;

/**
 * Split a pool using the largest-remainder method. Weights can be hours,
 * points, or any other non-negative relative allocation. Ties are stable by
 * input order, which makes the result reproducible for a UI.
 */
export function splitTipPoolLargestRemainder(
  poolCents: Cents,
  weights: readonly number[],
): Cents[] {
  asCents(poolCents);
  if (poolCents < 0) {
    throw new RangeError("Pool cannot be negative");
  }
  if (weights.length === 0) {
    throw new RangeError("At least one pool weight is required");
  }
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError("Pool weights must be finite and non-negative");
  }

  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  if (!Number.isFinite(weightTotal) || weightTotal <= 0) {
    throw new RangeError("At least one pool weight must be positive");
  }

  const exactShares = weights.map((weight) => (poolCents * weight) / weightTotal);
  const allocations = exactShares.map(Math.floor);
  let leftovers = poolCents - allocations.reduce((total, amount) => total + amount, 0);

  const byRemainder = exactShares
    .map((share, index) => ({ index, remainder: share - allocations[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < byRemainder.length && leftovers > 0; index += 1) {
    allocations[byRemainder[index].index] += 1;
    leftovers -= 1;
  }

  return allocations;
}

export const splitTipPool = splitTipPoolLargestRemainder;
export const splitPoolLargestRemainder = splitTipPoolLargestRemainder;

export interface WorkerCompensationInput {
  hourlyRateCents: Cents;
  hours: number;
  tipsCents?: Cents;
  tipOutCents?: Cents;
}

export interface WorkerCompensation {
  wagesCents: Cents;
  tipsCents: Cents;
  tipOutCents: Cents;
  totalCompensationCents: Cents;
  realHourlyRateCents: number;
}

/** Combine wage and tip calculations for a later worker detail view. */
export function calculateWorkerCompensation({
  hourlyRateCents,
  hours,
  tipsCents = 0,
  tipOutCents = 0,
}: WorkerCompensationInput): WorkerCompensation {
  asCents(hourlyRateCents);
  asCents(tipsCents);
  asCents(tipOutCents);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new RangeError("Hours must be a finite, non-negative number");
  }

  const wagesCents = asCents(roundHalfUp(hourlyRateCents * hours));
  const totalCompensationCents = asCents(sumCents([wagesCents, tipsCents, -tipOutCents]));
  return {
    wagesCents,
    tipsCents,
    tipOutCents,
    totalCompensationCents,
    realHourlyRateCents: calculateRealHourlyRateCents(totalCompensationCents, hours),
  };
}
