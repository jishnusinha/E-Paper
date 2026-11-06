import { clampCoordinates, updateAiSuggestionSchema } from "@epaper/shared";
import { AiSuggestion } from "../../models/AiSuggestion.js";
import { Segment } from "../../models/Segment.js";
import { AppError } from "../../utils/errors.js";
import type { SuggestedArticle } from "@epaper/shared";
import type mongoose from "mongoose";

export function serializeSuggestion(doc: InstanceType<typeof AiSuggestion>) {
  return {
    id: String(doc._id),
    editionId: String(doc.editionId),
    pageId: String(doc.pageId),
    aiJobId: String(doc.aiJobId),
    provider: "sarvam" as const,
    title: doc.title ?? "",
    coordinates: doc.coordinates,
    extractedText: doc.extractedText ?? "",
    sourceBlockIds: doc.sourceBlockIds ?? [],
    confidence: doc.confidence ?? null,
    reviewRequired: Boolean(doc.reviewRequired),
    status: doc.status,
    acceptedSegmentId: doc.acceptedSegmentId
      ? String(doc.acceptedSegmentId)
      : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function replaceSuggestionsForJob(params: {
  editionId: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  articles: SuggestedArticle[];
}) {
  // Soft-retire previous pending suggestions for this page so history remains.
  await AiSuggestion.updateMany(
    { pageId: params.pageId, status: "pending" },
    { $set: { status: "rejected" } }
  );

  if (params.articles.length === 0) return [];

  const docs = await AiSuggestion.insertMany(
    params.articles.map((article) => ({
      editionId: params.editionId,
      pageId: params.pageId,
      aiJobId: params.jobId,
      provider: "sarvam",
      title: article.title,
      coordinates: clampCoordinates(article.coordinates),
      extractedText: article.extractedText ?? "",
      sourceBlockIds: article.sourceBlockIds,
      confidence: article.confidence,
      reviewRequired: article.reviewRequired,
      status: "pending",
    }))
  );

  return docs.map(serializeSuggestion);
}

export async function listSuggestionsForPage(pageId: string) {
  const docs = await AiSuggestion.find({ pageId }).sort({ createdAt: 1 });
  return docs.map(serializeSuggestion);
}

export async function updateSuggestion(
  suggestionId: string,
  body: unknown
) {
  const data = updateAiSuggestionSchema.parse(body);
  const suggestion = await AiSuggestion.findById(suggestionId);
  if (!suggestion) throw new AppError("Suggestion not found", 404, "NOT_FOUND");
  if (suggestion.status !== "pending") {
    throw new AppError(
      "Only pending suggestions can be edited",
      409,
      "SUGGESTION_NOT_PENDING"
    );
  }

  if (data.title !== undefined) suggestion.title = data.title;
  if (data.coordinates) {
    suggestion.coordinates = clampCoordinates(data.coordinates);
  }
  await suggestion.save();
  return serializeSuggestion(suggestion);
}

export async function acceptSuggestion(suggestionId: string) {
  const suggestion = await AiSuggestion.findById(suggestionId);
  if (!suggestion) throw new AppError("Suggestion not found", 404, "NOT_FOUND");

  // Idempotent: already accepted → return linked segment.
  if (suggestion.status === "accepted" && suggestion.acceptedSegmentId) {
    const existing = await Segment.findById(suggestion.acceptedSegmentId);
    if (existing) {
      return {
        suggestion: serializeSuggestion(suggestion),
        segment: serializeSegment(existing),
        alreadyAccepted: true,
      };
    }
  }

  if (suggestion.status === "rejected") {
    throw new AppError(
      "Rejected suggestions cannot be accepted",
      409,
      "SUGGESTION_REJECTED"
    );
  }

  if (suggestion.status === "accepted" && !suggestion.acceptedSegmentId) {
    // Repair path — create segment if link was lost.
  } else if (suggestion.status !== "pending" && suggestion.status !== "accepted") {
    throw new AppError("Suggestion is not pending", 409, "SUGGESTION_NOT_PENDING");
  }

  const segment = await Segment.create({
    editionId: suggestion.editionId,
    pageId: suggestion.pageId,
    title: suggestion.title || "",
    coordinates: clampCoordinates(suggestion.coordinates),
    hoverColor: "rgba(79, 70, 229, 0.14)",
    hoverOpacity: 0.14,
    isEnabled: true,
    extractedText: suggestion.extractedText || "",
    source: "ai",
    aiSuggestionId: suggestion._id,
  });

  suggestion.status = "accepted";
  suggestion.acceptedSegmentId = segment._id;
  await suggestion.save();

  return {
    suggestion: serializeSuggestion(suggestion),
    segment: serializeSegment(segment),
    alreadyAccepted: false,
  };
}

export async function rejectSuggestion(suggestionId: string) {
  const suggestion = await AiSuggestion.findById(suggestionId);
  if (!suggestion) throw new AppError("Suggestion not found", 404, "NOT_FOUND");

  if (suggestion.status === "accepted") {
    throw new AppError(
      "Accepted suggestions cannot be rejected",
      409,
      "SUGGESTION_ACCEPTED"
    );
  }

  suggestion.status = "rejected";
  await suggestion.save();
  return serializeSuggestion(suggestion);
}

export async function acceptAllPending(pageId: string) {
  const pending = await AiSuggestion.find({ pageId, status: "pending" });
  const results = [];
  for (const item of pending) {
    results.push(await acceptSuggestion(String(item._id)));
  }
  return results;
}

export async function rejectAllPending(pageId: string) {
  await AiSuggestion.updateMany(
    { pageId, status: "pending" },
    { $set: { status: "rejected" } }
  );
  return listSuggestionsForPage(pageId);
}

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
    extractedText: (segment as { extractedText?: string }).extractedText ?? "",
    source: (segment as { source?: string }).source ?? "manual",
    createdAt: segment.createdAt,
    updatedAt: segment.updatedAt,
  };
}
