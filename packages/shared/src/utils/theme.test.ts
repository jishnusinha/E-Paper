import { describe, expect, it } from "vitest";
import { CLASSIC_SIDEBAR_THEME, MODERN_BOTTOM_THEME } from "../schemas/index.js";
import { isThemeConfiguration, validateThemeConfiguration } from "./theme.js";

describe("theme validation", () => {
  it("accepts seeded classic theme", () => {
    expect(isThemeConfiguration(CLASSIC_SIDEBAR_THEME)).toBe(true);
    expect(validateThemeConfiguration(CLASSIC_SIDEBAR_THEME).layout).toBe(
      "sidebar"
    );
  });

  it("accepts seeded bottom theme", () => {
    expect(isThemeConfiguration(MODERN_BOTTOM_THEME)).toBe(true);
    expect(validateThemeConfiguration(MODERN_BOTTOM_THEME).layout).toBe(
      "bottom"
    );
  });

  it("rejects invalid configs", () => {
    expect(isThemeConfiguration({ layout: "grid" })).toBe(false);
  });
});
