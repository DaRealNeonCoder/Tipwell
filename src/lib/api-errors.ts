import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth-helpers";
import { InputValidationError } from "@/lib/shift-schema";

export function apiError(error: unknown, fallback: string) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (error instanceof InputValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof SyntaxError || error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (error instanceof Error && error.message === "Workplace not found.") return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: fallback }, { status: 500 });
}
