import { z } from "zod";
import { MIN_SEGMENT_SIZE } from "../utils/coordinates.js";

export const publicationDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const segmentCoordinatesSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().gt(0).max(1),
    height: z.number().gt(0).max(1),
  })
  .superRefine((coords, ctx) => {
    if (coords.width < MIN_SEGMENT_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Width too small",
        path: ["width"],
      });
    }
    if (coords.height < MIN_SEGMENT_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height too small",
        path: ["height"],
      });
    }
    if (coords.x + coords.width > 1.000001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rectangle exceeds page width",
        path: ["width"],
      });
    }
    if (coords.y + coords.height > 1.000001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rectangle exceeds page height",
        path: ["height"],
      });
    }
  });

export const themePaginationSchema = z.object({
  position: z.enum(["left", "right", "bottom"]),
  thumbnailSize: z.number().min(40).max(240),
  showPageNumbers: z.boolean(),
  collapsible: z.boolean(),
});

export const themeViewerSchema = z.object({
  backgroundColor: z.string().min(1),
  enableZoom: z.boolean(),
  enableFullscreen: z.boolean(),
});

export const themeSegmentsSchema = z.object({
  hoverColor: z.string().min(1),
  hoverOpacity: z.number().min(0).max(1),
  borderColor: z.string().min(1),
  borderRadius: z.number().min(0).max(24),
});

export const themeModalSchema = z.object({
  maxWidth: z.string().min(1),
  backgroundColor: z.string().min(1),
});

export const themeConfigurationSchema = z.object({
  layout: z.enum(["sidebar", "bottom"]),
  pagination: themePaginationSchema,
  viewer: themeViewerSchema,
  segments: themeSegmentsSchema,
  modal: themeModalSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const createEditionSchema = z.object({
  title: z.string().min(1).max(200),
  publicationDate: publicationDateSchema,
  themeId: z.string().optional(),
});

export const updateEditionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  themeId: z.string().optional(),
  themeConfig: themeConfigurationSchema.optional(),
});

export const createSegmentSchema = z.object({
  title: z.string().max(300).optional(),
  coordinates: segmentCoordinatesSchema,
  hoverColor: z.string().optional(),
  hoverOpacity: z.number().min(0).max(1).optional(),
  isEnabled: z.boolean().optional(),
});

export const updateSegmentSchema = createSegmentSchema.partial();

export const batchSegmentsSchema = z.object({
  create: z.array(createSegmentSchema.extend({ clientId: z.string().optional() })).default([]),
  update: z
    .array(
      z.object({
        id: z.string(),
        data: updateSegmentSchema,
      })
    )
    .default([]),
  delete: z.array(z.string()).default([]),
});

export const aiDetectSchema = z.object({
  language: z
    .string()
    .regex(/^[a-z]{2}-[A-Z]{2}$/, "Language must be BCP-47 like en-IN")
    .default("en-IN"),
  force: z.boolean().optional().default(false),
});

export const updateAiSuggestionSchema = z.object({
  title: z.string().max(300).optional(),
  coordinates: segmentCoordinatesSchema.optional(),
});

export const reorderPagesSchema = z.object({
  pageIds: z.array(z.string()).min(1),
});

export const updatePageSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  displayPageNumber: z.number().int().positive().optional(),
  isVisible: z.boolean().optional(),
});

export const CLASSIC_SIDEBAR_THEME = {
  layout: "sidebar" as const,
  pagination: {
    position: "left" as const,
    thumbnailSize: 96,
    showPageNumbers: true,
    collapsible: true,
  },
  viewer: {
    backgroundColor: "#ece7e4",
    enableZoom: true,
    enableFullscreen: true,
  },
  segments: {
    hoverColor: "rgba(220, 38, 38, 0.14)",
    hoverOpacity: 0.14,
    borderColor: "rgba(185, 28, 28, 0.8)",
    borderRadius: 2,
  },
  modal: {
    maxWidth: "960px",
    backgroundColor: "#FFFFFF",
  },
};

export const MODERN_BOTTOM_THEME = {
  layout: "bottom" as const,
  pagination: {
    position: "bottom" as const,
    thumbnailSize: 80,
    showPageNumbers: true,
    collapsible: false,
  },
  viewer: {
    backgroundColor: "#ece7e4",
    enableZoom: true,
    enableFullscreen: true,
  },
  segments: {
    hoverColor: "rgba(220, 38, 38, 0.16)",
    hoverOpacity: 0.16,
    borderColor: "rgba(185, 28, 28, 0.85)",
    borderRadius: 2,
  },
  modal: {
    maxWidth: "1024px",
    backgroundColor: "#FFFFFF",
  },
};
