import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-errors";
import { deleteShift, updateShift } from "@/lib/shift-queries";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const shift = await updateShift(await requireUserId(), (await params).id, await request.json());
    return shift ? NextResponse.json(shift) : NextResponse.json({ error: "Shift not found." }, { status: 404 });
  } catch (error) {
    return apiError(error, "Unable to update shift.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const shift = await deleteShift(await requireUserId(), (await params).id);
    return shift ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Shift not found." }, { status: 404 });
  } catch (error) {
    return apiError(error, "Unable to delete shift.");
  }
}
