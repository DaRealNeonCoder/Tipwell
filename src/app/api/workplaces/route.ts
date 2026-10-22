import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-errors";
import { createWorkplace, listWorkplaces } from "@/lib/shift-queries";

export async function GET() {
  try {
    return NextResponse.json(await listWorkplaces(await requireUserId()));
  } catch (error) {
    return apiError(error, "Unable to load workplaces.");
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createWorkplace(await requireUserId(), await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to save workplace.");
  }
}
