import { describe, expect, it } from "vitest";
import { siteConfig } from "./site";

describe("site configuration", () => {
  it("provides the app shell identity", () => {
    expect(siteConfig.name).toBe("Tipwell");
    expect(siteConfig.description).toBeTruthy();
  });
});
