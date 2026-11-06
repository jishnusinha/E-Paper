import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { Edition } from "../../models/Edition.js";
import { Page } from "../../models/Page.js";
import { ProcessingJob } from "../../models/ProcessingJob.js";
import { buildThumbnailUrl, uploadPageImage } from "../storage/index.js";
import { renderPdfPagesBounded } from "./renderer.js";

const WORKER_ID = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
let running = false;

async function updateEditionProgress(
  editionId: string,
  data: {
    processingStatus?: string;
    processingError?: string | null;
    totalPages?: number;
    stage?: string;
    completedPages?: number;
    message?: string;
  }
) {
  const update: Record<string, unknown> = {};
  if (data.processingStatus) update.processingStatus = data.processingStatus;
  if (data.processingError !== undefined) {
    update.processingError = data.processingError;
  }
  if (data.totalPages !== undefined) update.totalPages = data.totalPages;

  if (
    data.stage ||
    data.completedPages !== undefined ||
    data.message !== undefined ||
    data.totalPages !== undefined
  ) {
    update.processingProgress = {
      stage: data.stage ?? "processing",
      totalPages: data.totalPages ?? 0,
      completedPages: data.completedPages ?? 0,
      message: data.message,
    };
  }

  await Edition.findByIdAndUpdate(editionId, { $set: update });
}

async function processJob(jobId: string) {
  const job = await ProcessingJob.findById(jobId);
  if (!job || !job.localPdfPath) return;

  const editionId = String(job.editionId);
  const workDir = path.join(os.tmpdir(), "epaper", editionId, randomUUID());

  try {
    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: "processing",
      claimedAt: new Date(),
      claimOwner: WORKER_ID,
      leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      "progress.stage": "reading",
    });

    await updateEditionProgress(editionId, {
      processingStatus: "processing",
      processingError: null,
      stage: "reading",
      message: "Reading PDF",
    });

    await fs.mkdir(workDir, { recursive: true });

    // Remove previous pages on retry
    await Page.deleteMany({ editionId: job.editionId });

    await updateEditionProgress(editionId, {
      stage: "generating_pages",
      message: "Generating pages",
    });

    const total = await renderPdfPagesBounded(
      job.localPdfPath,
      workDir,
      async (rendered, _index, pageTotal) => {
        const upload = await uploadPageImage(
          rendered.imagePath,
          `${editionId}/page-${rendered.pageNumber}`
        );

        const thumbnailUrl = buildThumbnailUrl(upload.publicId, 240);

        await Page.create({
          editionId: job.editionId,
          sourcePdfPageNumber: rendered.pageNumber,
          displayPageNumber: rendered.pageNumber,
          displayOrder: rendered.pageNumber,
          pdfWidth: rendered.pdfWidth,
          pdfHeight: rendered.pdfHeight,
          imageWidth: upload.width || rendered.imageWidth,
          imageHeight: upload.height || rendered.imageHeight,
          imagePublicId: upload.publicId,
          imageUrl: upload.url,
          thumbnailUrl,
          isVisible: true,
        });

        await ProcessingJob.findByIdAndUpdate(jobId, {
          "progress.totalPages": pageTotal,
          "progress.completedPages": rendered.pageNumber,
          "progress.stage": "generating_pages",
          leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        await updateEditionProgress(editionId, {
          stage: "generating_pages",
          totalPages: pageTotal,
          completedPages: rendered.pageNumber,
          message: `Generating pages ${rendered.pageNumber} / ${pageTotal}`,
        });

        await fs.unlink(rendered.imagePath).catch(() => undefined);
      },
      env.PDF_PROCESSING_CONCURRENCY
    );

    await updateEditionProgress(editionId, {
      processingStatus: "ready",
      totalPages: total,
      stage: "done",
      completedPages: total,
      message: "Processing complete",
      processingError: null,
    });

    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: "completed",
      completedAt: new Date(),
      "progress.totalPages": total,
      "progress.completedPages": total,
      "progress.stage": "done",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    console.error("[pdf:processor]", message, error);

    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: "failed",
      failureDetails: message,
      $inc: { retryCount: 1 },
    });

    await updateEditionProgress(editionId, {
      processingStatus: "failed",
      stage: "failed",
      message,
      processingError: message,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function enqueueProcessingJob(
  editionId: string,
  localPdfPath: string
) {
  const job = await ProcessingJob.create({
    editionId,
    status: "queued",
    localPdfPath,
    progress: { totalPages: 0, completedPages: 0, stage: "queued" },
  });

  await Edition.findByIdAndUpdate(editionId, {
    processingStatus: "queued",
    processingProgress: {
      stage: "uploading",
      totalPages: 0,
      completedPages: 0,
      message: "Queued for processing",
    },
    processingError: null,
  });

  void tickProcessor();
  return job;
}

export async function tickProcessor() {
  if (running) return;
  running = true;

  try {
    // Recover stale leases
    await ProcessingJob.updateMany(
      {
        status: "processing",
        leaseExpiresAt: { $lt: new Date() },
      },
      {
        $set: { status: "queued", claimOwner: null, leaseExpiresAt: null },
      }
    );

    while (true) {
      const job = await ProcessingJob.findOneAndUpdate(
        { status: "queued" },
        {
          $set: {
            status: "processing",
            claimedAt: new Date(),
            claimOwner: WORKER_ID,
            leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) break;
      await processJob(String(job._id));
    }
  } finally {
    running = false;
  }
}

export function startProcessingWorker() {
  void tickProcessor();
  setInterval(() => {
    void tickProcessor();
  }, 5000);
}
