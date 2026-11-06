import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import {
  CLASSIC_SIDEBAR_THEME,
  createEditionSchema,
  updateEditionSchema,
  isValidCoordinates,
} from "@epaper/shared";
import { Edition } from "../models/Edition.js";
import { Page } from "../models/Page.js";
import { Segment } from "../models/Segment.js";
import { Theme } from "../models/Theme.js";
import { ProcessingJob } from "../models/ProcessingJob.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { uploadPdf } from "../services/storage/index.js";
import {
  enqueueProcessingJob,
  tickProcessor,
} from "../services/pdf/processor.js";

async function serializeEdition(edition: InstanceType<typeof Edition>) {
  const [pageCount, segmentCount] = await Promise.all([
    Page.countDocuments({ editionId: edition._id }),
    Segment.countDocuments({ editionId: edition._id }),
  ]);

  return {
    id: String(edition._id),
    title: edition.title,
    publicationDate: edition.publicationDate,
    originalPdfPublicId: edition.originalPdfPublicId,
    originalPdfUrl: edition.originalPdfUrl,
    totalPages: edition.totalPages || pageCount,
    themeId: edition.themeId ? String(edition.themeId) : null,
    themeKey: edition.themeKey,
    themeConfig: edition.themeConfig,
    processingStatus: edition.processingStatus,
    publicationStatus: edition.publicationStatus,
    processingProgress: edition.processingProgress,
    processingError: edition.processingError,
    publishedAt: edition.publishedAt,
    pageCount,
    segmentCount,
    createdAt: edition.createdAt,
    updatedAt: edition.updatedAt,
  };
}

export const listEditions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const sort = String(req.query.sort ?? "-publicationDate");

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { publicationDate: { $regex: search, $options: "i" } },
    ];
  }
  if (status && ["draft", "published", "archived"].includes(status)) {
    filter.publicationStatus = status;
  }

  const sortSpec: Record<string, 1 | -1> = {};
  if (sort.startsWith("-")) sortSpec[sort.slice(1)] = -1;
  else sortSpec[sort] = 1;

  const [items, total] = await Promise.all([
    Edition.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit),
    Edition.countDocuments(filter),
  ]);

  const data = await Promise.all(items.map((e) => serializeEdition(e)));
  return sendSuccess(res, {
    items: data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

export const getDashboardStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const [
      totalEditions,
      publishedEditions,
      draftEditions,
      totalPages,
      totalSegments,
    ] = await Promise.all([
      Edition.countDocuments(),
      Edition.countDocuments({ publicationStatus: "published" }),
      Edition.countDocuments({ publicationStatus: "draft" }),
      Page.countDocuments(),
      Segment.countDocuments(),
    ]);

    return sendSuccess(res, {
      totalEditions,
      publishedEditions,
      draftEditions,
      totalPages,
      totalSegments,
    });
  }
);

export const getEdition = asyncHandler(async (req: Request, res: Response) => {
  const edition = await Edition.findById(req.params.id);
  if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");
  return sendSuccess(res, await serializeEdition(edition));
});

export const createEdition = asyncHandler(async (req: Request, res: Response) => {
  const body = createEditionSchema.parse({
    title: req.body.title,
    publicationDate: req.body.publicationDate,
    themeId: req.body.themeId || undefined,
  });

  const file = req.file;
  if (!file) throw new AppError("PDF file is required", 400, "PDF_REQUIRED");
  if (file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are allowed", 400, "INVALID_FILE_TYPE");
  }

  const existing = await Edition.findOne({
    publicationDate: body.publicationDate,
  });
  if (existing) {
    await fs.unlink(file.path).catch(() => undefined);
    throw new AppError(
      "An edition already exists for this date",
      409,
      "DATE_EXISTS"
    );
  }

  let theme = body.themeId
    ? await Theme.findById(body.themeId)
    : await Theme.findOne({ key: "classic-sidebar" });

  if (!theme) {
    theme = await Theme.create({
      key: "classic-sidebar",
      name: "Classic Sidebar Reader",
      description: "Vertical page thumbnails beside the newspaper",
      configuration: CLASSIC_SIDEBAR_THEME,
      isActive: true,
    });
  }

  const edition = await Edition.create({
    title: body.title,
    publicationDate: body.publicationDate,
    themeId: theme._id,
    themeKey: theme.key,
    themeConfig: theme.configuration,
    processingStatus: "uploaded",
    publicationStatus: "draft",
    processingProgress: {
      stage: "uploading",
      totalPages: 0,
      completedPages: 0,
      message: "Uploading PDF",
    },
  });

  try {
    const upload = await uploadPdf(
      file.path,
      `edition-${String(edition._id)}`
    );

    edition.originalPdfPublicId = upload.publicId;
    edition.originalPdfUrl = upload.url;
    await edition.save();

    const persistDir = path.join(os.tmpdir(), "epaper", "jobs");
    await fs.mkdir(persistDir, { recursive: true });
    const persistedPdf = path.join(
      persistDir,
      `${String(edition._id)}-${randomUUID()}.pdf`
    );
    await fs.copyFile(file.path, persistedPdf);
    await fs.unlink(file.path).catch(() => undefined);

    await enqueueProcessingJob(String(edition._id), persistedPdf);

    const refreshed = await Edition.findById(edition._id);
    return sendSuccess(res, await serializeEdition(refreshed!), 201);
  } catch (error) {
    await Edition.findByIdAndDelete(edition._id);
    await fs.unlink(file.path).catch(() => undefined);
    throw error;
  }
});

export const updateEdition = asyncHandler(async (req: Request, res: Response) => {
  const body = updateEditionSchema.parse(req.body);
  const edition = await Edition.findById(req.params.id);
  if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

  if (body.title) edition.title = body.title;

  if (body.themeId) {
    const theme = await Theme.findById(body.themeId);
    if (!theme) throw new AppError("Theme not found", 404, "THEME_NOT_FOUND");
    edition.themeId = theme._id;
    edition.themeKey = theme.key;
    edition.themeConfig = body.themeConfig ?? theme.configuration;
  } else if (body.themeConfig) {
    edition.themeConfig = body.themeConfig;
  }

  await edition.save();
  return sendSuccess(res, await serializeEdition(edition));
});

export const deleteEdition = asyncHandler(async (req: Request, res: Response) => {
  const edition = await Edition.findById(req.params.id);
  if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

  await Promise.all([
    Page.deleteMany({ editionId: edition._id }),
    Segment.deleteMany({ editionId: edition._id }),
    ProcessingJob.deleteMany({ editionId: edition._id }),
    Edition.deleteOne({ _id: edition._id }),
  ]);

  return sendSuccess(res, { ok: true });
});

export const getProcessingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

    const job = await ProcessingJob.findOne({ editionId: edition._id }).sort({
      createdAt: -1,
    });

    return sendSuccess(res, {
      processingStatus: edition.processingStatus,
      processingProgress: edition.processingProgress,
      processingError: edition.processingError,
      totalPages: edition.totalPages,
      job: job
        ? {
            id: String(job._id),
            status: job.status,
            retryCount: job.retryCount,
            failureDetails: job.failureDetails,
          }
        : null,
    });
  }
);

export const retryProcessing = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

    const lastJob = await ProcessingJob.findOne({ editionId: edition._id }).sort(
      { createdAt: -1 }
    );
    if (!lastJob?.localPdfPath) {
      throw new AppError(
        "No local PDF available for retry. Re-upload the edition.",
        400,
        "NO_PDF"
      );
    }

    await enqueueProcessingJob(String(edition._id), lastJob.localPdfPath);
    void tickProcessor();

    const refreshed = await Edition.findById(edition._id);
    return sendSuccess(res, await serializeEdition(refreshed!));
  }
);

export const publishEdition = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

    if (edition.processingStatus !== "ready") {
      throw new AppError(
        "PDF processing must complete before publishing",
        400,
        "NOT_READY"
      );
    }

    const pages = await Page.find({ editionId: edition._id, isVisible: true });
    if (pages.length === 0) {
      throw new AppError("Edition has no pages", 400, "NO_PAGES");
    }

    if (!edition.themeConfig && !edition.themeKey) {
      throw new AppError("Edition theme is missing", 400, "NO_THEME");
    }

    const segments = await Segment.find({ editionId: edition._id });
    for (const segment of segments) {
      if (!isValidCoordinates(segment.coordinates)) {
        throw new AppError(
          `Segment ${segment._id} has invalid coordinates`,
          400,
          "INVALID_SEGMENT"
        );
      }
    }

    edition.publicationStatus = "published";
    edition.publishedAt = new Date();
    await edition.save();

    return sendSuccess(res, await serializeEdition(edition));
  }
);

export const unpublishEdition = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");
    edition.publicationStatus = "draft";
    await edition.save();
    return sendSuccess(res, await serializeEdition(edition));
  }
);

export const previewEdition = asyncHandler(
  async (req: Request, res: Response) => {
    const edition = await Edition.findById(req.params.id);
    if (!edition) throw new AppError("Edition not found", 404, "NOT_FOUND");

    const pages = await Page.find({ editionId: edition._id }).sort({
      displayOrder: 1,
    });
    const segments = await Segment.find({
      editionId: edition._id,
      isEnabled: true,
    });

    return sendSuccess(res, {
      edition: await serializeEdition(edition),
      pages: pages.map((p) => ({
        id: String(p._id),
        editionId: String(p.editionId),
        sourcePdfPageNumber: p.sourcePdfPageNumber,
        displayPageNumber: p.displayPageNumber,
        displayOrder: p.displayOrder,
        title: p.title,
        pdfWidth: p.pdfWidth,
        pdfHeight: p.pdfHeight,
        imageWidth: p.imageWidth,
        imageHeight: p.imageHeight,
        imagePublicId: p.imagePublicId,
        imageUrl: p.imageUrl,
        thumbnailUrl: p.thumbnailUrl,
        isVisible: p.isVisible,
      })),
      segments: segments.map((s) => ({
        id: String(s._id),
        editionId: String(s.editionId),
        pageId: String(s.pageId),
        title: s.title,
        coordinates: s.coordinates,
        hoverColor: s.hoverColor,
        hoverOpacity: s.hoverOpacity,
        isEnabled: s.isEnabled,
      })),
    });
  }
);
