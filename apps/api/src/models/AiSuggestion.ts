import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { MIN_SEGMENT_SIZE } from "@epaper/shared";

const coordinatesSchema = new Schema(
  {
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 },
    width: { type: Number, required: true, min: MIN_SEGMENT_SIZE, max: 1 },
    height: { type: Number, required: true, min: MIN_SEGMENT_SIZE, max: 1 },
  },
  { _id: false }
);

const aiSuggestionSchema = new Schema(
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
    aiJobId: {
      type: Schema.Types.ObjectId,
      ref: "AiProcessingJob",
      required: true,
      index: true,
    },
    provider: { type: String, enum: ["sarvam"], default: "sarvam", required: true },
    title: { type: String, trim: true, default: "" },
    coordinates: { type: coordinatesSchema, required: true },
    extractedText: { type: String, default: "" },
    sourceBlockIds: { type: [String], default: [] },
    confidence: { type: Number, default: null },
    reviewRequired: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
      index: true,
    },
    acceptedSegmentId: {
      type: Schema.Types.ObjectId,
      ref: "Segment",
      default: null,
    },
  },
  { timestamps: true }
);

aiSuggestionSchema.index({ pageId: 1, status: 1 });
aiSuggestionSchema.index({ aiJobId: 1, status: 1 });

export type AiSuggestionDocument = InferSchemaType<typeof aiSuggestionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AiSuggestion = mongoose.model("AiSuggestion", aiSuggestionSchema);
