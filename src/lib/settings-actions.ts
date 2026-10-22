"use server";

import { requireUserId } from "@/lib/auth-helpers";
import { getUserSettings, saveUserSettings, settingsUpdateSchema } from "@/lib/settings";

export async function readUserSettings() {
  return getUserSettings(await requireUserId());
}

export async function updateUserSettings(input: unknown) {
  const update = settingsUpdateSchema.parse(input);
  return saveUserSettings(await requireUserId(), update);
}
