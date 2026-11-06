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

const segmentSchema = new Schema(
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
    title: { type: String, trim: true, default: "" },
    coordinates: { type: coordinatesSchema, required: true },
    hoverColor: { type: String, default: "rgba(79, 70, 229, 0.14)" },
    hoverOpacity: { type: Number, default: 0.14, min: 0, max: 1 },
    isEnabled: { type: Boolean, default: true },
    /** Optional OCR text preserved when a segment originates from AI. */
    extractedText: { type: String, default: "" },
    source: {
      type: String,
      enum: ["manual", "ai"],
      default: "manual",
    },
    aiSuggestionId: {
      type: Schema.Types.ObjectId,
      ref: "AiSuggestion",
      default: null,
    },
  },
  { timestamps: true }
);

segmentSchema.pre("validate", function (next) {
  const c = this.coordinates;
  if (!c) return next();
  if (c.x + c.width > 1.000001 || c.y + c.height > 1.000001) {
    return next(new Error("Segment coordinates exceed page bounds"));
  }
  next();
});

export type SegmentDocument = InferSchemaType<typeof segmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Segment = mongoose.model("Segment", segmentSchema);
