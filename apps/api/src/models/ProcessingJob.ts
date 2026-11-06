import mongoose, { Schema, type InferSchemaType } from "mongoose";

const processingJobSchema = new Schema(
  {
    editionId: {
      type: Schema.Types.ObjectId,
      ref: "Edition",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    progress: {
      totalPages: { type: Number, default: 0 },
      completedPages: { type: Number, default: 0 },
      stage: { type: String, default: "queued" },
    },
    failureDetails: { type: String },
    localPdfPath: { type: String },
    claimedAt: { type: Date },
    claimOwner: { type: String },
    leaseExpiresAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

processingJobSchema.index({ status: 1, leaseExpiresAt: 1 });

export type ProcessingJobDocument = InferSchemaType<
  typeof processingJobSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const ProcessingJob = mongoose.model("ProcessingJob", processingJobSchema);
