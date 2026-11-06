import { themeConfigurationSchema } from "../schemas/index.js";
import type { ThemeConfiguration } from "../types/index.js";

export function validateThemeConfiguration(
  config: unknown
): ThemeConfiguration {
  return themeConfigurationSchema.parse(config);
}

export function isThemeConfiguration(config: unknown): config is ThemeConfiguration {
  return themeConfigurationSchema.safeParse(config).success;
}
