import mongoose, { Schema, type InferSchemaType } from "mongoose";

const processingProgressSchema = new Schema(
  {
    stage: {
      type: String,
      enum: [
        "uploading",
        "reading",
        "generating_pages",
        "creating_previews",
        "finalizing",
        "done",
        "failed",
      ],
      default: "uploading",
    },
    totalPages: { type: Number, default: 0 },
    completedPages: { type: Number, default: 0 },
    message: { type: String },
  },
  { _id: false }
);

const editionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    publicationDate: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    originalPdfPublicId: { type: String },
    originalPdfUrl: { type: String },
    totalPages: { type: Number, default: 0 },
    themeId: { type: Schema.Types.ObjectId, ref: "Theme" },
    themeKey: { type: String, default: "classic-sidebar" },
    themeConfig: { type: Schema.Types.Mixed },
    processingStatus: {
      type: String,
      enum: ["uploaded", "queued", "processing", "ready", "failed"],
      default: "uploaded",
      index: true,
    },
    publicationStatus: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    processingProgress: {
      type: processingProgressSchema,
      default: () => ({
        stage: "uploading",
        totalPages: 0,
        completedPages: 0,
      }),
    },
    processingError: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

export type EditionDocument = InferSchemaType<typeof editionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Edition = mongoose.model("Edition", editionSchema);
