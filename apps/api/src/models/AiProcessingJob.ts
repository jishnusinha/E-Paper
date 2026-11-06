import mongoose, { Schema, type InferSchemaType } from "mongoose";

const aiProcessingJobSchema = new Schema(
  {
    editionId: {
      type: Schema.Types.ObjectId,
      ref: "Edition",
      required: true,
      index: true,
    },
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      required: true,
      index: true,
    },
    provider: { type: String, enum: ["sarvam"], default: "sarvam", required: true },
    providerJobId: { type: String, index: true },
    status: {
      type: String,
      enum: [
        "queued",
        "submitted",
        "processing",
        "completed",
        "partially_completed",
        "failed",
        "rejected",
      ],
      default: "queued",
      required: true,
      index: true,
    },
    stage: { type: String, default: "queued" },
    language: { type: String, default: "en-IN" },
    sourceImageHash: { type: String, required: true, index: true },
    cacheKey: { type: String, required: true, index: true },
    processingVersion: { type: String, default: "v1" },
    errorMessage: { type: String },
    estimatedCostInr: { type: Number },
    providerUsage: {
      pagesTotal: Number,
      pagesProcessed: Number,
      pagesSucceeded: Number,
      pagesFailed: Number,
    },
    rawBlocks: { type: Schema.Types.Mixed },
    lastPolledAt: { type: Date },
    completedAt: { type: Date },
    fromCache: { type: Boolean, default: false },
  },
  { timestamps: true }
);

aiProcessingJobSchema.index({ pageId: 1, cacheKey: 1, status: 1 });
aiProcessingJobSchema.index({ pageId: 1, createdAt: -1 });

export type AiProcessingJobDocument = InferSchemaType<
  typeof aiProcessingJobSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const AiProcessingJob = mongoose.model(
  "AiProcessingJob",
  aiProcessingJobSchema
);
