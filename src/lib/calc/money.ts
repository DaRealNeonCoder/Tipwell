/** Monetary values used by the calculation layer are whole cents. */
export type Cents = number;

export type MoneyInput = number | string | null | undefined;

const MONEY_PATTERN = /^([+-]?)(?:(\d{1,3}(?:,\d{3})+|\d+))(?:\.(\d+))?$/;

/**
 * Round a number using the financial convention of rounding a half away from
 * zero. The result is deterministic for both positive and negative values.
 */
export function roundHalfUp(value: number, decimalPlaces = 0): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("Cannot round a non-finite number");
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new RangeError("decimalPlaces must be a non-negative integer");
  }

  const factor = 10 ** decimalPlaces;
  const scaled = Math.abs(value) * factor;
  // The small tolerance avoids values such as 1.005 * 100 becoming
  // 100.49999999999999 because of binary floating point representation.
  const rounded = Math.floor(scaled + 0.5 + Number.EPSILON * Math.max(1, scaled));
  return Math.sign(value) * (rounded / factor);
}

/** Convert a dollar amount to cents, rounding fractional cents half-up. */
export function dollarsToCents(value: number): Cents {
  if (!Number.isFinite(value)) {
    throw new RangeError("Money must be finite");
  }
  return roundHalfUp(value * 100);
}

function parseStringToCents(value: string): Cents | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const parenthesized = trimmed.startsWith("(") && trimmed.endsWith(")");
  const withoutParentheses = parenthesized ? trimmed.slice(1, -1).trim() : trimmed;
  const currencyPrefix = /^([+-]?)\s*[$€£]\s*(.*)$/.exec(withoutParentheses);
  const normalized = currencyPrefix
    ? `${currencyPrefix[1]}${currencyPrefix[2]}`
    : withoutParentheses;
  const match = MONEY_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  const [, sign, wholePart, fraction = ""] = match;
  const whole = Number(wholePart.replaceAll(",", ""));
  if (!Number.isSafeInteger(whole)) {
    return null;
  }

  const centsPart = Number((fraction.slice(0, 2) + "00").slice(0, 2));
  const roundsUp = fraction.length > 2 && Number(fraction[2]) >= 5;
  const magnitude = whole * 100 + centsPart + (roundsUp ? 1 : 0);
  if (!Number.isSafeInteger(magnitude)) {
    return null;
  }

  const negative = sign === "-" || parenthesized;
  return negative ? -magnitude : magnitude;
}

/**
 * Parse user-entered money safely. Invalid, empty, and non-finite inputs
 * return null instead of producing NaN or silently accepting partial input.
 * Strings may contain a currency symbol, thousands separators, and any
 * number of fractional digits; fractional cents are rounded half-up.
 */
export function parseMoneyToCents(value: MoneyInput): Cents | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? dollarsToCents(value) : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  return parseStringToCents(value);
}

/** Assert that a value is a finite, whole-cent amount. */
export function asCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Cents must be a safe integer");
  }
  return value;
}

/** Format cents for display without doing any floating-point money math. */
export function formatCents(value: Cents, currency = "USD", locale = "en-US"): string {
  asCents(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export const formatMoney = formatCents;

/** Add whole-cent values without introducing decimal money drift. */
export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, value) => total + asCents(value), 0);
}

/** Calculate a percentage of a cent amount, rounding only at the result. */
export function percentageOfCents(baseCents: Cents, percentage: number): Cents {
  asCents(baseCents);
  if (!Number.isFinite(percentage) || percentage < 0) {
    throw new RangeError("Percentage must be a finite, non-negative number");
  }
  return asCents(roundHalfUp((baseCents * percentage) / 100));
}
