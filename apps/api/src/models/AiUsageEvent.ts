import mongoose, { Schema, type InferSchemaType } from "mongoose";

const aiUsageEventSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["request", "cache_hit", "failed", "completed"],
      required: true,
      index: true,
    },
    provider: { type: String, enum: ["sarvam"], default: "sarvam" },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", index: true },
    editionId: { type: Schema.Types.ObjectId, ref: "Edition", index: true },
    jobId: { type: Schema.Types.ObjectId, ref: "AiProcessingJob" },
    providerJobId: { type: String },
    estimatedCostInr: { type: Number, default: 0 },
    pagesProcessed: { type: Number, default: 0 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

aiUsageEventSchema.index({ createdAt: -1 });
aiUsageEventSchema.index({ kind: 1, createdAt: -1 });

export type AiUsageEventDocument = InferSchemaType<typeof aiUsageEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AiUsageEvent = mongoose.model("AiUsageEvent", aiUsageEventSchema);
