import type { AiUsageSummary } from "@epaper/shared";
import { env, isSarvamAiEnabled, isSarvamConfigured } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import { AiUsageEvent } from "../../models/AiUsageEvent.js";
import { AiProcessingJob } from "../../models/AiProcessingJob.js";

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function assertWithinBudget(): Promise<void> {
  if (!isSarvamAiEnabled()) {
    throw new AppError(
      isSarvamConfigured()
        ? "Sarvam AI is disabled. Set SARVAM_AI_ENABLED=true to enable."
        : "Sarvam AI is not configured. Set SARVAM_API_KEY and SARVAM_AI_ENABLED=true.",
      503,
      "AI_UNAVAILABLE"
    );
  }

  const dayStart = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const [dailyRequests, dailyPages, monthlyCost] = await Promise.all([
    AiUsageEvent.countDocuments({
      kind: "request",
      createdAt: { $gte: dayStart },
    }),
    AiUsageEvent.aggregate<{ total: number }>([
      {
        $match: {
          kind: "request",
          createdAt: { $gte: dayStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$pagesProcessed" } } },
    ]),
    AiUsageEvent.aggregate<{ total: number }>([
      {
        $match: {
          kind: { $in: ["request", "completed"] },
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$estimatedCostInr" } } },
    ]),
  ]);

  const pagesUsed = dailyPages[0]?.total ?? 0;
  const costUsed = monthlyCost[0]?.total ?? 0;
  const estimatedNext = env.SARVAM_ESTIMATED_COST_PER_PAGE_INR;

  if (dailyRequests >= env.SARVAM_MAX_REQUESTS_PER_DAY) {
    throw new AppError(
      `Daily AI request limit reached (${env.SARVAM_MAX_REQUESTS_PER_DAY}).`,
      429,
      "AI_DAILY_REQUEST_LIMIT"
    );
  }

  if (pagesUsed >= env.SARVAM_MAX_PAGES_PER_DAY) {
    throw new AppError(
      `Daily AI page limit reached (${env.SARVAM_MAX_PAGES_PER_DAY}).`,
      429,
      "AI_DAILY_PAGE_LIMIT"
    );
  }

  if (costUsed + estimatedNext > env.SARVAM_MONTHLY_BUDGET_INR) {
    throw new AppError(
      `Monthly AI budget limit reached (₹${env.SARVAM_MONTHLY_BUDGET_INR}).`,
      429,
      "AI_MONTHLY_BUDGET"
    );
  }
}

export async function recordUsageEvent(input: {
  kind: "request" | "cache_hit" | "failed" | "completed";
  pageId?: string;
  editionId?: string;
  jobId?: string;
  providerJobId?: string;
  estimatedCostInr?: number;
  pagesProcessed?: number;
  meta?: Record<string, unknown>;
}) {
  await AiUsageEvent.create({
    kind: input.kind,
    provider: "sarvam",
    pageId: input.pageId,
    editionId: input.editionId,
    jobId: input.jobId,
    providerJobId: input.providerJobId,
    estimatedCostInr: input.estimatedCostInr ?? 0,
    pagesProcessed: input.pagesProcessed ?? 0,
    meta: input.meta,
  });
}

export async function getUsageSummary(): Promise<AiUsageSummary> {
  const dayStart = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const [
    requestsThisMonth,
    pagesAgg,
    cachedResultsServed,
    costAgg,
    dailyRequests,
    dailyPagesAgg,
  ] = await Promise.all([
    AiUsageEvent.countDocuments({
      kind: "request",
      createdAt: { $gte: monthStart },
    }),
    AiUsageEvent.aggregate<{ total: number }>([
      { $match: { kind: "request", createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$pagesProcessed" } } },
    ]),
    AiUsageEvent.countDocuments({
      kind: "cache_hit",
      createdAt: { $gte: monthStart },
    }),
    AiUsageEvent.aggregate<{ total: number }>([
      {
        $match: {
          kind: { $in: ["request", "completed"] },
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$estimatedCostInr" } } },
    ]),
    AiUsageEvent.countDocuments({
      kind: "request",
      createdAt: { $gte: dayStart },
    }),
    AiUsageEvent.aggregate<{ total: number }>([
      { $match: { kind: "request", createdAt: { $gte: dayStart } } },
      { $group: { _id: null, total: { $sum: "$pagesProcessed" } } },
    ]),
  ]);

  const estimatedUsageInr = costAgg[0]?.total ?? 0;

  return {
    enabled: isSarvamAiEnabled(),
    configured: isSarvamConfigured(),
    requestsThisMonth,
    pagesAnalyzedThisMonth: pagesAgg[0]?.total ?? 0,
    cachedResultsServed,
    estimatedUsageInr,
    monthlyBudgetInr: env.SARVAM_MONTHLY_BUDGET_INR,
    dailyRequestsUsed: dailyRequests,
    maxRequestsPerDay: env.SARVAM_MAX_REQUESTS_PER_DAY,
    dailyPagesUsed: dailyPagesAgg[0]?.total ?? 0,
    maxPagesPerDay: env.SARVAM_MAX_PAGES_PER_DAY,
    remainingBudgetInr: Math.max(
      0,
      env.SARVAM_MONTHLY_BUDGET_INR - estimatedUsageInr
    ),
  };
}

export async function findReusableCompletedJob(cacheKey: string, pageId: string) {
  return AiProcessingJob.findOne({
    pageId,
    cacheKey,
    status: "completed",
  }).sort({ completedAt: -1 });
}
