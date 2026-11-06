import type { Request, Response } from "express";
import mongoose from "mongoose";
import { aiDetectSchema } from "@epaper/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/errors.js";
import { Page } from "../models/Page.js";
import { AiSuggestion } from "../models/AiSuggestion.js";
import {
  getLatestJobForPage,
  startPageDetection,
} from "../services/ai/sarvamJobService.js";
import {
  acceptAllPending,
  acceptSuggestion,
  listSuggestionsForPage,
  rejectAllPending,
  rejectSuggestion,
  updateSuggestion,
} from "../services/ai/suggestionService.js";
import { getUsageSummary } from "../services/ai/usageLimiter.js";
import { isSarvamAiEnabled, isSarvamConfigured } from "../config/env.js";

async function requirePage(pageId: string) {
  const id = String(pageId ?? "").trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid page id "${id || "(empty)"}"`,
      400,
      "INVALID_PAGE_ID"
    );
  }
  const page = await Page.findById(id);
  if (!page) {
    throw new AppError(
      `Page not found for id ${id}`,
      404,
      "NOT_FOUND"
    );
  }
  return page;
}

export const detectPage = asyncHandler(async (req: Request, res: Response) => {
  const body = aiDetectSchema.parse(req.body ?? {});
  await requirePage(req.params.pageId);

  const result = await startPageDetection({
    pageId: req.params.pageId,
    language: body.language,
    force: body.force,
  });

  return sendSuccess(res, result, 202);
});

export const getPageAiJob = asyncHandler(async (req: Request, res: Response) => {
  await requirePage(req.params.pageId);
  const job = await getLatestJobForPage(req.params.pageId);
  return sendSuccess(res, {
    job,
    ai: {
      enabled: isSarvamAiEnabled(),
      configured: isSarvamConfigured(),
    },
  });
});

export const getPageAiSuggestions = asyncHandler(
  async (req: Request, res: Response) => {
    await requirePage(req.params.pageId);
    const suggestions = await listSuggestionsForPage(req.params.pageId);
    return sendSuccess(res, suggestions);
  }
);

export const patchAiSuggestion = asyncHandler(
  async (req: Request, res: Response) => {
    const suggestion = await updateSuggestion(req.params.suggestionId, req.body);
    return sendSuccess(res, suggestion);
  }
);

export const acceptAiSuggestion = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await acceptSuggestion(req.params.suggestionId);
    return sendSuccess(res, result);
  }
);

export const rejectAiSuggestion = asyncHandler(
  async (req: Request, res: Response) => {
    const suggestion = await rejectSuggestion(req.params.suggestionId);
    return sendSuccess(res, suggestion);
  }
);

export const acceptAllAiSuggestions = asyncHandler(
  async (req: Request, res: Response) => {
    await requirePage(req.params.pageId);
    const results = await acceptAllPending(req.params.pageId);
    return sendSuccess(res, results);
  }
);

export const rejectAllAiSuggestions = asyncHandler(
  async (req: Request, res: Response) => {
    await requirePage(req.params.pageId);
    const suggestions = await rejectAllPending(req.params.pageId);
    return sendSuccess(res, suggestions);
  }
);

export const getAiUsage = asyncHandler(async (_req: Request, res: Response) => {
  const usage = await getUsageSummary();
  return sendSuccess(res, usage);
});

export const getAiSuggestion = asyncHandler(
  async (req: Request, res: Response) => {
    const doc = await AiSuggestion.findById(req.params.suggestionId);
    if (!doc) throw new AppError("Suggestion not found", 404, "NOT_FOUND");
    const { serializeSuggestion } = await import(
      "../services/ai/suggestionService.js"
    );
    return sendSuccess(res, serializeSuggestion(doc));
  }
);
