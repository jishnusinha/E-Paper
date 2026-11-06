import mongoose, { Schema, type InferSchemaType } from "mongoose";

const themeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    configuration: { type: Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ThemeDocument = InferSchemaType<typeof themeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Theme = mongoose.model("Theme", themeSchema);
