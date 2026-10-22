import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import {
  DEFAULT_SETTINGS,
  settingsUpdateSchema,
  settingsValuesSchema,
  type SettingsUpdate,
  type SettingsValues,
} from "@/lib/settings-schema";

export { DEFAULT_SETTINGS, settingsPatchSchema, settingsUpdateSchema, settingsValuesSchema } from "@/lib/settings-schema";
export type { SettingsUpdate, SettingsValues } from "@/lib/settings-schema";

function toSettingsValues(row: typeof userSettings.$inferSelect): SettingsValues {
  return {
    region: row.region,
    currency: row.currency,
    defaultTipBps: row.defaultTipBps,
    defaultTipBase: row.defaultTipBase,
    isWorker: row.isWorker,
    plan: row.plan,
  };
}

export async function getUserSettings(userId: string): Promise<SettingsValues> {
  const [row] = await getDb().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return row ? toSettingsValues(row) : DEFAULT_SETTINGS;
}

/**
 * Local calculator preferences can be submitted once after sign-in. They are
 * only used when the account has no persisted settings yet; persisted values
 * always win on subsequent updates.
 */
export async function saveUserSettings(
  userId: string,
  update: SettingsUpdate,
  localSettings?: SettingsUpdate,
): Promise<SettingsValues> {
  const [existing] = await getDb().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const values = settingsValuesSchema.parse({
    ...(existing ? toSettingsValues(existing) : DEFAULT_SETTINGS),
    ...(existing ? {} : localSettings ?? {}),
    ...update,
  });
  const now = new Date();
  const [saved] = await getDb()
    .insert(userSettings)
    .values({ userId, ...values, updatedAt: now })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...values, updatedAt: now },
    })
    .returning();
  return toSettingsValues(saved);
}

export async function mergeLocalSettings(userId: string, localSettings: unknown): Promise<SettingsValues> {
  return saveUserSettings(userId, {}, settingsUpdateSchema.parse(localSettings));
}
