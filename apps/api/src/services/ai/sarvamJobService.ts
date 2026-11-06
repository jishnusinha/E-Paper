import { AI_PROCESSING_VERSION } from "@epaper/shared";
import { env } from "../../config/env.js";
import { Page } from "../../models/Page.js";
import { AiProcessingJob } from "../../models/AiProcessingJob.js";
import { AppError } from "../../utils/errors.js";
import { buildCacheKey } from "./coordinateMapper.js";
import { preparePageImage } from "./imagePreparation.js";
import { groupBlocksIntoArticles } from "./articleGrouping.js";
import { parseSarvamZipToBlocks } from "./sarvamResultParser.js";
import {
  isTerminalSarvamStatus,
  sarvamClient,
} from "./sarvamClient.js";
import {
  assertWithinBudget,
  findReusableCompletedJob,
  recordUsageEvent,
} from "./usageLimiter.js";
import { replaceSuggestionsForJob } from "./suggestionService.js";

const ACTIVE_STATUSES = ["queued", "submitted", "processing"] as const;

export function serializeJob(
  job: InstanceType<typeof AiProcessingJob>,
  extras?: { suggestionCount?: number; cached?: boolean }
) {
  return {
    id: String(job._id),
    editionId: String(job.editionId),
    pageId: String(job.pageId),
    provider: "sarvam" as const,
    providerJobId: job.providerJobId || null,
    status: job.status,
    stage: job.stage,
    language: job.language,
    sourceImageHash: job.sourceImageHash,
    cached: extras?.cached ?? Boolean(job.fromCache),
    errorMessage: job.errorMessage || null,
    estimatedCostInr: job.estimatedCostInr ?? null,
    suggestionCount: extras?.suggestionCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
  };
}

export async function startPageDetection(params: {
  pageId: string;
  language: string;
  force?: boolean;
}) {
  const page = await Page.findById(params.pageId);
  if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

  // In-flight job for this page — reuse instead of charging again.
  const active = await AiProcessingJob.findOne({
    pageId: page._id,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ createdAt: -1 });

  if (active) {
    await reconcileJob(String(active._id));
    const refreshed = await AiProcessingJob.findById(active._id);
    return {
      job: serializeJob(refreshed!),
      reused: true,
      cached: false,
    };
  }

  const prepared = await preparePageImage({
    pageId: String(page._id),
    imagePublicId: page.imagePublicId,
    imageUrl: page.imageUrl,
  });

  const cacheKey = buildCacheKey({
    sourceImageHash: prepared.contentHash,
    language: params.language,
    provider: "sarvam",
    processingVersion: AI_PROCESSING_VERSION,
  });

  if (!params.force) {
    const cached = await findReusableCompletedJob(cacheKey, String(page._id));
    if (cached) {
      await recordUsageEvent({
        kind: "cache_hit",
        pageId: String(page._id),
        editionId: String(page.editionId),
        jobId: String(cached._id),
        providerJobId: cached.providerJobId ?? undefined,
        pagesProcessed: 0,
        estimatedCostInr: 0,
      });

      // Clone a lightweight job record so the UI shows a fresh completed status.
      const clone = await AiProcessingJob.create({
        editionId: page.editionId,
        pageId: page._id,
        provider: "sarvam",
        providerJobId: cached.providerJobId ?? undefined,
        status: "completed",
        stage: "suggestions_ready",
        language: params.language,
        sourceImageHash: prepared.contentHash,
        cacheKey,
        processingVersion: AI_PROCESSING_VERSION,
        estimatedCostInr: 0,
        rawBlocks: cached.rawBlocks,
        fromCache: true,
        completedAt: new Date(),
      });

      // Re-materialize suggestions from cached blocks if needed.
      if (Array.isArray(cached.rawBlocks) && cached.rawBlocks.length) {
        const articles = groupBlocksIntoArticles(cached.rawBlocks as never);
        await replaceSuggestionsForJob({
          editionId: page.editionId,
          pageId: page._id,
          jobId: clone._id,
          articles,
        });
      }

      return {
        job: serializeJob(clone, { cached: true }),
        reused: false,
        cached: true,
      };
    }
  }

  await assertWithinBudget();

  const job = await AiProcessingJob.create({
    editionId: page.editionId,
    pageId: page._id,
    provider: "sarvam",
    status: "queued",
    stage: "preparing_image",
    language: params.language,
    sourceImageHash: prepared.contentHash,
    cacheKey,
    processingVersion: AI_PROCESSING_VERSION,
    estimatedCostInr: env.SARVAM_ESTIMATED_COST_PER_PAGE_INR,
  });

  try {
    job.stage = "submitting_to_sarvam";
    await job.save();

    const submitted = await sarvamClient.submitParse({
      filename: prepared.filename,
      buffer: prepared.buffer,
      mimeType: prepared.mimeType,
      language: params.language,
    });

    job.providerJobId = submitted.jobId;
    job.status = "submitted";
    job.stage = "document_analysis_running";
    await job.save();

    await recordUsageEvent({
      kind: "request",
      pageId: String(page._id),
      editionId: String(page.editionId),
      jobId: String(job._id),
      providerJobId: submitted.jobId,
      estimatedCostInr: env.SARVAM_ESTIMATED_COST_PER_PAGE_INR,
      pagesProcessed: 1,
    });

    // Best-effort immediate reconciliation (non-blocking for client).
    void reconcileJob(String(job._id)).catch(() => undefined);

    return {
      job: serializeJob(job),
      reused: false,
      cached: false,
    };
  } catch (error) {
    job.status = "failed";
    job.stage = "analysis_failed";
    job.errorMessage =
      error instanceof Error ? error.message : "Failed to submit to Sarvam";
    job.completedAt = new Date();
    await job.save();

    await recordUsageEvent({
      kind: "failed",
      pageId: String(page._id),
      editionId: String(page.editionId),
      jobId: String(job._id),
      estimatedCostInr: 0,
      meta: { message: job.errorMessage },
    });

    throw error;
  }
}

export async function getLatestJobForPage(pageId: string) {
  const page = await Page.findById(pageId);
  if (!page) throw new AppError("Page not found", 404, "NOT_FOUND");

  const job = await AiProcessingJob.findOne({ pageId: page._id }).sort({
    createdAt: -1,
  });
  if (!job) return null;

  if (ACTIVE_STATUSES.includes(job.status as (typeof ACTIVE_STATUSES)[number])) {
    await reconcileJob(String(job._id));
  }

  const refreshed = await AiProcessingJob.findById(job._id);
  return serializeJob(refreshed!);
}

/**
 * Request-driven status reconciliation (Railway-friendly).
 * Throttles provider polling via lastPolledAt.
 */
export async function reconcileJob(jobId: string) {
  const job = await AiProcessingJob.findById(jobId);
  if (!job) return null;
  if (!job.providerJobId) return serializeJob(job);

  if (
    job.status === "completed" ||
    job.status === "failed" ||
    job.status === "rejected" ||
    job.status === "partially_completed"
  ) {
    return serializeJob(job);
  }

  const pollIntervalMs = Math.max(2, env.SARVAM_POLL_INTERVAL_SECONDS) * 1000;
  if (
    job.lastPolledAt &&
    Date.now() - job.lastPolledAt.getTime() < pollIntervalMs
  ) {
    return serializeJob(job);
  }

  job.lastPolledAt = new Date();
  await job.save();

  const status = await sarvamClient.getStatus(job.providerJobId);
  job.providerUsage = {
    pagesTotal: status.usage?.pages_total,
    pagesProcessed: status.usage?.pages_processed,
    pagesSucceeded: status.usage?.pages_succeeded,
    pagesFailed: status.usage?.pages_failed,
  };

  const normalized = status.status.toLowerCase();

  if (!isTerminalSarvamStatus(normalized)) {
    job.status = "processing";
    job.stage = "document_analysis_running";
    await job.save();
    return serializeJob(job);
  }

  if (normalized === "failed" || normalized === "rejected") {
    job.status = normalized === "rejected" ? "rejected" : "failed";
    job.stage =
      normalized === "rejected" ? "rejected" : "analysis_failed";
    job.errorMessage = `Sarvam job ${normalized}`;
    job.completedAt = new Date();
    await job.save();
    await recordUsageEvent({
      kind: "failed",
      pageId: String(job.pageId),
      editionId: String(job.editionId),
      jobId: String(job._id),
      providerJobId: job.providerJobId,
    });
    return serializeJob(job);
  }

  if (normalized === "partially_completed") {
    job.status = "partially_completed";
    job.stage = "partially_completed";
    job.errorMessage =
      "Sarvam returned a partial result. Re-run detection if needed.";
    job.completedAt = new Date();
    await job.save();
    // Still attempt to harvest whatever is available.
  }

  try {
    job.stage = "retrieving_results";
    await job.save();

    const download = await sarvamClient.getDownloadUrl(job.providerJobId);
    const zip = await sarvamClient.downloadZip(download.url);

    job.stage = "grouping_article_regions";
    await job.save();

    const page = await Page.findById(job.pageId);
    const blocks = await parseSarvamZipToBlocks(zip, page
      ? { width: page.imageWidth, height: page.imageHeight }
      : undefined);

    job.rawBlocks = blocks;
    const articles = groupBlocksIntoArticles(blocks);
    await replaceSuggestionsForJob({
      editionId: job.editionId,
      pageId: job.pageId,
      jobId: job._id,
      articles,
    });

    if (job.status !== "partially_completed") {
      job.status = "completed";
    }
    job.stage = "suggestions_ready";
    job.completedAt = new Date();
    await job.save();

    await recordUsageEvent({
      kind: "completed",
      pageId: String(job.pageId),
      editionId: String(job.editionId),
      jobId: String(job._id),
      providerJobId: job.providerJobId,
      pagesProcessed: 1,
      estimatedCostInr: 0,
      meta: { suggestionCount: articles.length, blockCount: blocks.length },
    });

    return serializeJob(job, { suggestionCount: articles.length });
  } catch (error) {
    job.status = "failed";
    job.stage = "analysis_failed";
    job.errorMessage =
      error instanceof Error ? error.message : "Failed to process Sarvam results";
    job.completedAt = new Date();
    await job.save();
    await recordUsageEvent({
      kind: "failed",
      pageId: String(job.pageId),
      editionId: String(job.editionId),
      jobId: String(job._id),
      providerJobId: job.providerJobId,
      meta: { message: job.errorMessage },
    });
    throw error;
  }
}
