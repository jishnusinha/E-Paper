import type { Request, Response } from "express";
import { reorderPagesSchema, updatePageSchema } from "@epaper/shared";
import { Edition } from "../models/Edition.js";
import { Page } from "../models/Page.js";
import { Segment } from "../models/Segment.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

function serializePage(
  page: InstanceType<typeof Page>,
  segmentCount = 0
) {
  return {
    id: String(page._id),
    editionId: String(page.editionId),
    sourcePdfPageNumber: page.sourcePdfPageNumber,
    displayPageNumber: page.displayPageNumber,
    displayOrder: page.displayOrder,
    title: page.title ?? "",
    pdfWidth: page.pdfWidth,
    pdfHeight: page.pdfHeight,
    imageWidth: page.imageWidth,
    imageHeight: page.imageHeight,
    imagePublicId: page.imagePublicId,
    imageUrl: page.imageUrl,
    thumbnailUrl: page.thumbnailUrl,
    isVisible: page.isVisible,
    segmentCount,
  };
}

export const listEditionPages = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

    const pages = await Page.find({ editionId: edition._id }).sort({
      displayOrder: 1,
    });

    const counts = await Segment.aggregate([
      { $match: { editionId: edition._id } },
      { $group: { _id: "$pageId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

    return sendSuccess(
      res,
      pages.map((p) => serializePage(p, countMap.get(String(p._id)) ?? 0))
    );
  }
);

export const getPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await Page.findById(req.params.pageId);
  if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");
  const segmentCount = await Segment.countDocuments({ pageId: page._id });
  return sendSuccess(res, serializePage(page, segmentCount));
});

export const updatePage = asyncHandler(async (req: Request, res: Response) => {
  const body = updatePageSchema.parse(req.body);
  const page = await Page.findById(req.params.pageId);
  if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

  if (body.title !== undefined) page.title = body.title ?? undefined;
  if (body.displayPageNumber !== undefined) {
    page.displayPageNumber = body.displayPageNumber;
  }
  if (body.isVisible !== undefined) page.isVisible = body.isVisible;

  await page.save();
  const segmentCount = await Segment.countDocuments({ pageId: page._id });
  return sendSuccess(res, serializePage(page, segmentCount));
});

export const reorderPages = asyncHandler(async (req: Request, res: Response) => {
  const { pageIds } = reorderPagesSchema.parse(req.body);
  const edition = await Edition.findById(req.params.id);
  if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

  const pages = await Page.find({ editionId: edition._id });
  if (pages.length !== pageIds.length) {
    throw new AppError("pageIds must include every page", 400, "INVALID_REORDER");
  }

  const pageMap = new Map(pages.map((p) => [String(p._id), p]));
  for (const id of pageIds) {
    if (!pageMap.has(id)) {
      throw new AppError("Invalid page id in reorder list", 400, "INVALID_PAGE");
    }
  }

  await Promise.all(
    pageIds.map((id, index) => {
      const page = pageMap.get(id)!;
      page.displayOrder = index + 1;
      page.displayPageNumber = index + 1;
      return page.save();
    })
  );

  const updated = await Page.find({ editionId: edition._id }).sort({
    displayOrder: 1,
  });
  return sendSuccess(
    res,
    updated.map((p) => serializePage(p))
  );
});
