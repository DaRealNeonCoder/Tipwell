import { z } from "zod";
import { parseMoneyToCents } from "./calc";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const numericInput = z.union([z.string(), z.number()]);

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

export const shiftIdSchema = z.uuid("A valid shift id is required.");
export const workplaceIdSchema = z.uuid("A valid workplace id is required.");
export const shiftDateSchema = z.string().regex(datePattern, "Use a date in YYYY-MM-DD format.").refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a real calendar date.");

export const shiftPayloadSchema = z.object({
  date: shiftDateSchema,
  workplaceId: workplaceIdSchema.nullable().optional(),
  hours: numericInput,
  baseWage: numericInput,
  sales: numericInput.nullable().optional(),
  cashTips: numericInput.optional(),
  cardTips: numericInput.optional(),
  tipOut: numericInput.optional(),
  serviceChargeShare: numericInput.optional(),
  notes: z.string().max(2000, "Notes must be 2,000 characters or fewer.").nullable().optional(),
}).strict();

export type ShiftPayload = z.infer<typeof shiftPayloadSchema>;

export const workplacePayloadSchema = z.object({
  name: z.string().trim().min(1, "Workplace name is required.").max(120, "Workplace name must be 120 characters or fewer."),
  defaultWage: numericInput.nullable().optional(),
}).strict();

export const dateRangeSchema = z.object({
  from: shiftDateSchema.optional(),
  to: shiftDateSchema.optional(),
}).refine(({ from, to }) => !from || !to || from <= to, {
  message: "The start date must be before the end date.",
  path: ["from"],
});

export type DateRange = z.infer<typeof dateRangeSchema>;

function inputText(value: string | number): string {
  return typeof value === "number" ? String(value) : value;
}

export function parseNonNegativeCents(value: string | number | null | undefined, field: string, optional = false): number {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    if (optional) return 0;
    throw new InputValidationError(`${field} is required.`);
  }
  const cents = parseMoneyToCents(inputText(value));
  if (cents === null || cents < 0) throw new InputValidationError(`${field} must be a valid, non-negative dollar amount.`);
  return cents;
}

function parseNullableCents(value: string | number | null | undefined, field: string): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  return parseNonNegativeCents(value, field);
}

/** Convert decimal hours without using a floating-point multiplication. */
export function parseHoursToX100(value: string | number): number {
  const text = inputText(value).trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new InputValidationError("Hours must be a non-negative decimal number.");
  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole)) throw new InputValidationError("Hours are too large.");
  const fraction = match[2] ?? "";
  const fractionHundredths = Number((fraction.slice(0, 2) + "00").slice(0, 2));
  const roundsUp = fraction.length > 2 && Number(fraction[2]) >= 5;
  const result = whole * 100 + fractionHundredths + (roundsUp ? 1 : 0);
  if (!Number.isSafeInteger(result)) throw new InputValidationError("Hours are too large.");
  return result;
}

export function parseShiftPayload(payload: ShiftPayload) {
  return {
    date: payload.date,
    workplaceId: payload.workplaceId ?? null,
    hoursX100: parseHoursToX100(payload.hours),
    baseWageCents: parseNonNegativeCents(payload.baseWage, "Base wage"),
    salesCents: parseNullableCents(payload.sales, "Sales"),
    cashTipsCents: parseNonNegativeCents(payload.cashTips, "Cash tips", true),
    cardTipsCents: parseNonNegativeCents(payload.cardTips, "Card tips", true),
    tipOutCents: parseNonNegativeCents(payload.tipOut, "Tip-out", true),
    serviceChargeShareCents: parseNonNegativeCents(payload.serviceChargeShare, "Service charge share", true),
    notes: payload.notes?.trim() || null,
  };
}

export function parseWorkplacePayload(payload: z.infer<typeof workplacePayloadSchema>) {
  const defaultWageCents = parseNullableCents(payload.defaultWage, "Default wage");
  return {
    name: payload.name.trim(),
    defaultWageCents,
  };
}
