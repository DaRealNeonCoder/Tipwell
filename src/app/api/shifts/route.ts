import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-errors";
import { dateRangeSchema } from "@/lib/shift-schema";
import { createShift, listShifts } from "@/lib/shift-queries";

function rangeFromRequest(request: Request) {
  const url = new URL(request.url);
  return dateRangeSchema.parse({ from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined });
}

export async function GET(request: Request) {
  try {
    const rows = await listShifts(await requireUserId(), rangeFromRequest(request));
    return NextResponse.json(rows.map(({ shift, workplaceName }) => ({ ...shift, workplaceName })));
  } catch (error) {
    return apiError(error, "Unable to load shifts.");
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createShift(await requireUserId(), await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to save shift.");
  }
}
