import type { Request, Response } from "express";
import {
  batchSegmentsSchema,
  clampCoordinates,
  createSegmentSchema,
  updateSegmentSchema,
} from "@epaper/shared";
import { Page } from "../models/Page.js";
import { Segment } from "../models/Segment.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { buildCropUrl } from "../services/storage/index.js";
import { toCropPixels } from "@epaper/shared";

function serializeSegment(segment: InstanceType<typeof Segment>) {
  return {
    id: String(segment._id),
    editionId: String(segment.editionId),
    pageId: String(segment.pageId),
    title: segment.title ?? "",
    coordinates: segment.coordinates,
    hoverColor: segment.hoverColor,
    hoverOpacity: segment.hoverOpacity,
    isEnabled: segment.isEnabled,
    extractedText: segment.extractedText ?? "",
    source: segment.source ?? "manual",
    createdAt: segment.createdAt,
    updatedAt: segment.updatedAt,
  };
}

export const listPageSegments = asyncHandler(
  async (req: Request, res: Response) => {
    const page = await Page.findById(req.params.pageId);
    if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

    const segments = await Segment.find({ pageId: page._id }).sort({
      createdAt: 1,
    });
    return sendSuccess(res, segments.map(serializeSegment));
  }
);

export const createSegment = asyncHandler(async (req: Request, res: Response) => {
  const body = createSegmentSchema.parse(req.body);
  const page = await Page.findById(req.params.pageId);
  if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

  const coordinates = clampCoordinates(body.coordinates);
  const segment = await Segment.create({
    editionId: page.editionId,
    pageId: page._id,
    title: body.title ?? "",
    coordinates,
    hoverColor: body.hoverColor,
    hoverOpacity: body.hoverOpacity,
    isEnabled: body.isEnabled ?? true,
  });

  return sendSuccess(res, serializeSegment(segment), 201);
});

export const updateSegment = asyncHandler(async (req: Request, res: Response) => {
  const body = updateSegmentSchema.parse(req.body);
  const segment = await Segment.findById(req.params.segmentId);
  if (!segment) throw new AppError("Segment not found", 404, "NOT_FOUND");

  if (body.title !== undefined) segment.title = body.title;
  if (body.coordinates) segment.coordinates = clampCoordinates(body.coordinates);
  if (body.hoverColor !== undefined) segment.hoverColor = body.hoverColor;
  if (body.hoverOpacity !== undefined) segment.hoverOpacity = body.hoverOpacity;
  if (body.isEnabled !== undefined) segment.isEnabled = body.isEnabled;

  await segment.save();
  return sendSuccess(res, serializeSegment(segment));
});

export const deleteSegment = asyncHandler(async (req: Request, res: Response) => {
  const segment = await Segment.findById(req.params.segmentId);
  if (!segment) throw new AppError("Segment not found", 404, "NOT_FOUND");
  await segment.deleteOne();
  return sendSuccess(res, { ok: true });
});

export const batchSegments = asyncHandler(async (req: Request, res: Response) => {
  const body = batchSegmentsSchema.parse(req.body);
  const page = await Page.findById(req.params.pageId);
  if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

  const created: ReturnType<typeof serializeSegment>[] = [];
  const updated: ReturnType<typeof serializeSegment>[] = [];
  const deleted: string[] = [];
  const clientIdMap: Record<string, string> = {};

  for (const item of body.create) {
    const segment = await Segment.create({
      editionId: page.editionId,
      pageId: page._id,
      title: item.title ?? "",
      coordinates: clampCoordinates(item.coordinates),
      hoverColor: item.hoverColor,
      hoverOpacity: item.hoverOpacity,
      isEnabled: item.isEnabled ?? true,
    });
    const serialized = serializeSegment(segment);
    created.push(serialized);
    if (item.clientId) clientIdMap[item.clientId] = serialized.id;
  }

  for (const item of body.update) {
    const segment = await Segment.findOne({
      _id: item.id,
      pageId: page._id,
    });
    if (!segment) continue;
    if (item.data.title !== undefined) segment.title = item.data.title;
    if (item.data.coordinates) {
      segment.coordinates = clampCoordinates(item.data.coordinates);
    }
    if (item.data.hoverColor !== undefined) {
      segment.hoverColor = item.data.hoverColor;
    }
    if (item.data.hoverOpacity !== undefined) {
      segment.hoverOpacity = item.data.hoverOpacity;
    }
    if (item.data.isEnabled !== undefined) {
      segment.isEnabled = item.data.isEnabled;
    }
    await segment.save();
    updated.push(serializeSegment(segment));
  }

  if (body.delete.length > 0) {
    await Segment.deleteMany({
      _id: { $in: body.delete },
      pageId: page._id,
    });
    deleted.push(...body.delete);
  }

  const segments = await Segment.find({ pageId: page._id }).sort({
    createdAt: 1,
  });

  return sendSuccess(res, {
    segments: segments.map(serializeSegment),
    created,
    updated,
    deleted,
    clientIdMap,
  });
});

export const getSegmentCrop = asyncHandler(
  async (req: Request, res: Response) => {
    const segment = await Segment.findById(req.params.segmentId);
    if (!segment) throw new AppError("Segment not found", 404, "NOT_FOUND");

    const page = await Page.findById(segment.pageId);
    if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

    const crop = toCropPixels(
      segment.coordinates,
      page.imageWidth,
      page.imageHeight
    );
    const url = await buildCropUrl(page.imagePublicId, crop);

    return sendSuccess(res, {
      segmentId: String(segment._id),
      pageId: String(page._id),
      crop,
      url,
      imageWidth: page.imageWidth,
      imageHeight: page.imageHeight,
    });
  }
);
