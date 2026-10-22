import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { shifts, workplaces } from "@/db/schema";
import { canUseFeature } from "@/lib/entitlements";
import {
  parseShiftPayload,
  parseWorkplacePayload,
  shiftIdSchema,
  shiftPayloadSchema,
  workplaceIdSchema,
  workplacePayloadSchema,
  type DateRange,
} from "@/lib/shift-schema";
import { shiftsToCsv } from "@/lib/shift-data";

function requireFeature(feature: Parameters<typeof canUseFeature>[0]) {
  if (!canUseFeature(feature)) throw new Error("This feature is not available for your account.");
}

export async function listWorkplaces(userId: string) {
  requireFeature("multipleWorkplaces");
  return getDb().select().from(workplaces).where(eq(workplaces.userId, userId)).orderBy(asc(workplaces.name));
}

export async function createWorkplace(userId: string, input: unknown) {
  requireFeature("multipleWorkplaces");
  const values = parseWorkplacePayload(workplacePayloadSchema.parse(input));
  const [workplace] = await getDb().insert(workplaces).values({ userId, ...values }).returning();
  return workplace;
}

export async function updateWorkplace(userId: string, id: string, input: unknown) {
  requireFeature("multipleWorkplaces");
  const workplaceId = workplaceIdSchema.parse(id);
  const values = parseWorkplacePayload(workplacePayloadSchema.parse(input));
  const [workplace] = await getDb().update(workplaces).set(values).where(and(eq(workplaces.id, workplaceId), eq(workplaces.userId, userId))).returning();
  return workplace ?? null;
}

export async function deleteWorkplace(userId: string, id: string) {
  requireFeature("multipleWorkplaces");
  const workplaceId = workplaceIdSchema.parse(id);
  const [workplace] = await getDb().delete(workplaces).where(and(eq(workplaces.id, workplaceId), eq(workplaces.userId, userId))).returning({ id: workplaces.id });
  return workplace ?? null;
}

async function assertOwnedWorkplace(userId: string, workplaceId: string | null) {
  if (!workplaceId) return;
  const [workplace] = await getDb().select({ id: workplaces.id }).from(workplaces).where(and(eq(workplaces.id, workplaceId), eq(workplaces.userId, userId))).limit(1);
  if (!workplace) throw new Error("Workplace not found.");
}

export async function listShifts(userId: string, range: DateRange = {}) {
  requireFeature("shiftLog");
  const conditions = [eq(shifts.userId, userId)];
  if (range.from) conditions.push(gte(shifts.date, range.from));
  if (range.to) conditions.push(lte(shifts.date, range.to));
  return getDb().select({ shift: shifts, workplaceName: workplaces.name }).from(shifts)
    .leftJoin(workplaces, and(eq(shifts.workplaceId, workplaces.id), eq(workplaces.userId, userId)))
    .where(and(...conditions)).orderBy(desc(shifts.date), desc(shifts.createdAt));
}

export async function createShift(userId: string, input: unknown) {
  requireFeature("shiftLog");
  const values = parseShiftPayload(shiftPayloadSchema.parse(input));
  await assertOwnedWorkplace(userId, values.workplaceId);
  const [shift] = await getDb().insert(shifts).values({ userId, ...values }).returning();
  return shift;
}

export async function updateShift(userId: string, id: string, input: unknown) {
  requireFeature("shiftLog");
  const shiftId = shiftIdSchema.parse(id);
  const values = parseShiftPayload(shiftPayloadSchema.parse(input));
  await assertOwnedWorkplace(userId, values.workplaceId);
  const [shift] = await getDb().update(shifts).set({ ...values, updatedAt: new Date() }).where(and(eq(shifts.id, shiftId), eq(shifts.userId, userId))).returning();
  return shift ?? null;
}

export async function deleteShift(userId: string, id: string) {
  requireFeature("shiftLog");
  const shiftId = shiftIdSchema.parse(id);
  const [shift] = await getDb().delete(shifts).where(and(eq(shifts.id, shiftId), eq(shifts.userId, userId))).returning({ id: shifts.id });
  return shift ?? null;
}

export async function exportShifts(userId: string, range: DateRange) {
  requireFeature("export");
  const rows = await listShifts(userId, range);
  return shiftsToCsv(rows.map(({ shift, workplaceName }) => ({ ...shift, workplaceName })));
}
