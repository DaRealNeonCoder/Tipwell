import { z } from "zod";

export const settingsValuesSchema = z.object({
  region: z.enum(["US", "CA"]),
  currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be a three-letter code."),
  defaultTipBps: z.number().int().min(0).max(10_000),
  defaultTipBase: z.enum(["pre_tax", "pre_tax_plus_fees", "pre_discount", "post_tax"]),
  isWorker: z.boolean(),
  plan: z.enum(["free", "pro"]),
});

export const settingsPatchSchema = settingsValuesSchema.partial().strict();

export const settingsUpdateSchema = settingsPatchSchema.refine(
  (value) => Object.keys(value).length > 0,
  "At least one setting is required.",
);

export type SettingsValues = z.infer<typeof settingsValuesSchema>;
export type SettingsUpdate = z.infer<typeof settingsPatchSchema>;

export const DEFAULT_SETTINGS: SettingsValues = {
  region: "US",
  currency: "USD",
  defaultTipBps: 1800,
  defaultTipBase: "pre_tax",
  isWorker: false,
  plan: "free",
};
