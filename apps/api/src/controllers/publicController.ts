import type { Request, Response } from "express";
import { toCropPixels } from "@epaper/shared";
import { Edition } from "../models/Edition.js";
import { Page } from "../models/Page.js";
import { Segment } from "../models/Segment.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { buildCropUrl } from "../services/storage/index.js";

async function getPublishedByDate(date: string) {
  const edition = await Edition.findOne({
    publicationDate: date,
    publicationStatus: "published",
    processingStatus: "ready",
  });
  if (!edition) {
    throw new AppError("Published edition not found", 404, "NOT_FOUND");
  }
  return edition;
}

function serializePublicEdition(edition: InstanceType<typeof Edition>) {
  return {
    id: String(edition._id),
    title: edition.title,
    publicationDate: edition.publicationDate,
    totalPages: edition.totalPages,
    themeKey: edition.themeKey,
    themeConfig: edition.themeConfig,
    publishedAt: edition.publishedAt,
  };
}

export const getLatestEdition = asyncHandler(
  async (_req: Request, res: Response) => {
    const edition = await Edition.findOne({
      publicationStatus: "published",
      processingStatus: "ready",
    }).sort({ publicationDate: -1 });

    if (!edition) {
      return sendSuccess(res, null);
    }

    return sendSuccess(res, serializePublicEdition(edition));
  }
);

export const listEditionDates = asyncHandler(
  async (_req: Request, res: Response) => {
    const editions = await Edition.find({
      publicationStatus: "published",
      processingStatus: "ready",
    })
      .select("publicationDate title totalPages")
      .sort({ publicationDate: -1 });

    const covers = await Page.find({
      editionId: { $in: editions.map((e) => e._id) },
      isVisible: true,
      displayOrder: 1,
    }).select("editionId thumbnailUrl");

    const coverByEdition = new Map(
      covers.map((page) => [String(page.editionId), page.thumbnailUrl])
    );

    return sendSuccess(
      res,
      editions.map((e) => ({
        date: e.publicationDate,
        title: e.title,
        totalPages: e.totalPages,
        coverThumbnailUrl: coverByEdition.get(String(e._id)) ?? null,
      }))
    );
  }
);

export const getEditionByDate = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await getPublishedByDate(String(req.params.date));
    return sendSuccess(res, serializePublicEdition(edition));
  }
);

export const getEditionPagesByDate = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await getPublishedByDate(String(req.params.date));
    const pages = await Page.find({
      editionId: edition._id,
      isVisible: true,
    }).sort({ displayOrder: 1 });

    return sendSuccess(
      res,
      pages.map((p) => ({
        id: String(p._id),
        displayPageNumber: p.displayPageNumber,
        displayOrder: p.displayOrder,
        title: p.title ?? "",
        imageWidth: p.imageWidth,
        imageHeight: p.imageHeight,
        imageUrl: p.imageUrl,
        thumbnailUrl: p.thumbnailUrl,
      }))
    );
  }
);

export const getEditionArticlesByDate = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await getPublishedByDate(String(req.params.date));
    const pages = await Page.find({
      editionId: edition._id,
      isVisible: true,
    }).sort({ displayOrder: 1 });

    const pageById = new Map(pages.map((page) => [String(page._id), page]));
    const segments = await Segment.find({
      editionId: edition._id,
      isEnabled: true,
      pageId: { $in: pages.map((page) => page._id) },
    }).sort({ createdAt: 1 });

    const articleResults = await Promise.all(
      segments.map(async (segment) => {
        const page = pageById.get(String(segment.pageId));
        if (!page) return null;

        const crop = toCropPixels(
          segment.coordinates,
          page.imageWidth,
          page.imageHeight
        );
        const imageUrl = await buildCropUrl(page.imagePublicId, crop, {
          width: 720,
        });

        return {
          id: String(segment._id),
          title:
            segment.title?.trim() ||
            `Story on page ${page.displayPageNumber}`,
          pageId: String(page._id),
          pageNumber: page.displayPageNumber,
          pageTitle: page.title?.trim() || `Page ${page.displayPageNumber}`,
          imageUrl,
          aspectRatio: crop.width / crop.height,
        };
      })
    );

    const articles = articleResults.filter(
      (article): article is NonNullable<typeof article> => article !== null
    );

    const sections = pages.map((page) => ({
      pageId: String(page._id),
      pageNumber: page.displayPageNumber,
      title: page.title?.trim() || `Page ${page.displayPageNumber}`,
      thumbnailUrl: page.thumbnailUrl,
      imageUrl: page.imageUrl,
      articleCount: articles.filter(
        (article) => article.pageId === String(page._id)
      ).length,
    }));

    return sendSuccess(res, {
      edition: serializePublicEdition(edition),
      sections,
      articles,
    });
  }
);

export const getPublicPageSegments = asyncHandler(
  async (req: Request, res: Response) => {
    const page = await Page.findById(req.params.pageId);
    if (!page || !page.isVisible) {
      throw new AppError("Page not found", 404, "NOT_FOUND");
    }

    const edition = await Edition.findById(page.editionId);
    if (
      !edition ||
      edition.publicationStatus !== "published" ||
      edition.processingStatus !== "ready"
    ) {
      throw new AppError("Page not found", 404, "NOT_FOUND");
    }

    const segments = await Segment.find({
      pageId: page._id,
      isEnabled: true,
    }).sort({ createdAt: 1 });

    return sendSuccess(
      res,
      segments.map((s) => ({
        id: String(s._id),
        pageId: String(s.pageId),
        title: s.title ?? "",
        coordinates: s.coordinates,
        hoverColor: s.hoverColor,
        hoverOpacity: s.hoverOpacity,
      }))
    );
  }
);

export const getPublicSegmentCrop = asyncHandler(
  async (req: Request, res: Response) => {
    const segment = await Segment.findById(req.params.segmentId);
    if (!segment || !segment.isEnabled) {
      throw new AppError("Segment not found", 404, "NOT_FOUND");
    }

    const page = await Page.findById(segment.pageId);
    if (!page || !page.isVisible) {
      throw new AppError("Segment not found", 404, "NOT_FOUND");
    }

    const edition = await Edition.findById(segment.editionId);
    if (
      !edition ||
      edition.publicationStatus !== "published" ||
      edition.processingStatus !== "ready"
    ) {
      throw new AppError("Segment not found", 404, "NOT_FOUND");
    }

    const crop = toCropPixels(
      segment.coordinates,
      page.imageWidth,
      page.imageHeight
    );
    const url = await buildCropUrl(page.imagePublicId, crop);

    return sendSuccess(res, {
      segmentId: String(segment._id),
      title: segment.title ?? "",
      crop,
      url,
      aspectRatio: crop.width / crop.height,
    });
  }
);
