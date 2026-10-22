import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-errors";
import { dateRangeSchema } from "@/lib/shift-schema";
import { exportShifts } from "@/lib/shift-queries";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const range = dateRangeSchema.parse({ from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined });
    const csv = await exportShifts(await requireUserId(), range);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=tipwell-shifts.csv",
      },
    });
  } catch (error) {
    return apiError(error, "Unable to export shifts.");
  }
}
