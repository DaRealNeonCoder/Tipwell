import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    return NextResponse.json(await getBillingStatus(await requireUserId()));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.json({ error: "Unable to load billing status." }, { status: 500 });
  }
}
