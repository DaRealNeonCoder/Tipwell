import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { getUserSettings, saveUserSettings, settingsPatchSchema, settingsUpdateSchema } from "@/lib/settings";

export async function GET() {
  try {
    return NextResponse.json(await getUserSettings(await requireUserId()));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.json({ error: "Unable to load settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
    }
    const { localSettings, ...update } = body as Record<string, unknown>;
    const parsedUpdate = settingsPatchSchema.parse(update);
    const parsedLocal = localSettings === undefined ? undefined : settingsUpdateSchema.parse(localSettings);
    if (Object.keys(parsedUpdate).length === 0 && parsedLocal === undefined) {
      return NextResponse.json({ error: "At least one setting is required." }, { status: 400 });
    }
    const saved = await saveUserSettings(await requireUserId(), parsedUpdate, parsedLocal);
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (error instanceof SyntaxError || error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to save settings." }, { status: 500 });
  }
}
