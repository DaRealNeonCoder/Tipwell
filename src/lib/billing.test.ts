import { describe, expect, it } from "vitest";
import { subscriptionGrantsAccess } from "./billing-policy";

describe("subscription entitlements", () => {
  it("only grants access for active and trialing subscriptions", () => {
    expect(subscriptionGrantsAccess("active")).toBe(true);
    expect(subscriptionGrantsAccess("trialing")).toBe(true);
    expect(subscriptionGrantsAccess("past_due")).toBe(false);
    expect(subscriptionGrantsAccess("canceled")).toBe(false);
    expect(subscriptionGrantsAccess(null)).toBe(false);
  });
});
