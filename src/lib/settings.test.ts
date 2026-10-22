import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsUpdateSchema } from "./settings-schema";

describe("settings validation", () => {
  it("accepts calculator preferences within their supported ranges", () => {
    expect(settingsUpdateSchema.parse({ region: "CA", defaultTipBps: 2250, defaultTipBase: "post_tax", isWorker: true })).toEqual({
      region: "CA",
      defaultTipBps: 2250,
      defaultTipBase: "post_tax",
      isWorker: true,
    });
  });

  it("rejects unknown fields and unsafe tip percentages", () => {
    expect(() => settingsUpdateSchema.parse({ defaultTipBps: 10_001 })).toThrow();
    expect(() => settingsUpdateSchema.parse({ currency: "US" })).toThrow();
  });

  it("keeps defaults aligned with the offline calculator", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      region: "US",
      currency: "USD",
      defaultTipBps: 1800,
      defaultTipBase: "pre_tax",
      isWorker: false,
      plan: "free",
    });
  });
});
