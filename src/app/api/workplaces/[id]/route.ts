import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-errors";
import { deleteWorkplace, updateWorkplace } from "@/lib/shift-queries";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const workplace = await updateWorkplace(await requireUserId(), (await params).id, await request.json());
    return workplace ? NextResponse.json(workplace) : NextResponse.json({ error: "Workplace not found." }, { status: 404 });
  } catch (error) {
    return apiError(error, "Unable to update workplace.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const workplace = await deleteWorkplace(await requireUserId(), (await params).id);
    return workplace ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Workplace not found." }, { status: 404 });
  } catch (error) {
    return apiError(error, "Unable to delete workplace.");
  }
}
