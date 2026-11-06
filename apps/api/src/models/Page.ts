import mongoose, { Schema, type InferSchemaType } from "mongoose";

const pageSchema = new Schema(
  {
    editionId: {
      type: Schema.Types.ObjectId,
      ref: "Edition",
      required: true,
      index: true,
    },
    sourcePdfPageNumber: { type: Number, required: true },
    displayPageNumber: { type: Number, required: true },
    displayOrder: { type: Number, required: true },
    title: { type: String, trim: true },
    pdfWidth: { type: Number, required: true },
    pdfHeight: { type: Number, required: true },
    imageWidth: { type: Number, required: true },
    imageHeight: { type: Number, required: true },
    imagePublicId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pageSchema.index({ editionId: 1, displayOrder: 1 });
pageSchema.index({ editionId: 1, sourcePdfPageNumber: 1 }, { unique: true });

export type PageDocument = InferSchemaType<typeof pageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Page = mongoose.model("Page", pageSchema);
