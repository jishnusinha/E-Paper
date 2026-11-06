import type { Request, Response } from "express";
import { Theme } from "../models/Theme.js";
import { Edition } from "../models/Edition.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { themeConfigurationSchema } from "@epaper/shared";

function serializeTheme(theme: InstanceType<typeof Theme>) {
  return {
    id: String(theme._id),
    key: theme.key,
    name: theme.name,
    description: theme.description,
    configuration: theme.configuration,
    isActive: theme.isActive,
  };
}

export const listThemes = asyncHandler(async (_req: Request, res: Response) => {
  const themes = await Theme.find({ isActive: true }).sort({ name: 1 });
  return sendSuccess(res, themes.map(serializeTheme));
});

export const getTheme = asyncHandler(async (req: Request, res: Response) => {
  const theme = await Theme.findById(req.params.id);
  if (!theme) throw new AppError("Theme not found", 404, "NOT_FOUND");
  return sendSuccess(res, serializeTheme(theme));
});

export const updateEditionTheme = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

    const themeId = String(req.body.themeId ?? "");
    const theme = await Theme.findById(themeId);
    if (!theme) throw new AppError("Theme not found", 404, "THEME_NOT_FOUND");

    const config = req.body.themeConfig
      ? themeConfigurationSchema.parse(req.body.themeConfig)
      : theme.configuration;

    edition.themeId = theme._id;
    edition.themeKey = theme.key;
    edition.themeConfig = config;
    await edition.save();

    return sendSuccess(res, {
      id: String(edition._id),
      themeId: String(theme._id),
      themeKey: theme.key,
      themeConfig: edition.themeConfig,
    });
  }
);
