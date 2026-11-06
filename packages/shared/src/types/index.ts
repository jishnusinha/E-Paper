export type ProcessingStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "ready"
  | "failed";

export type PublicationStatus = "draft" | "published" | "archived";

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type EditorTool = "select" | "draw" | "pan";

export interface SegmentCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThemePaginationConfig {
  position: "left" | "right" | "bottom";
  thumbnailSize: number;
  showPageNumbers: boolean;
  collapsible: boolean;
}

export interface ThemeViewerConfig {
  backgroundColor: string;
  enableZoom: boolean;
  enableFullscreen: boolean;
}

export interface ThemeSegmentsConfig {
  hoverColor: string;
  hoverOpacity: number;
  borderColor: string;
  borderRadius: number;
}

export interface ThemeModalConfig {
  maxWidth: string;
  backgroundColor: string;
}

export interface EpaperTheme {
  id: string;
  key: string;
  name: string;
  description?: string;
  layout: "sidebar" | "bottom";
  pagination: ThemePaginationConfig;
  viewer: ThemeViewerConfig;
  segments: ThemeSegmentsConfig;
  modal: ThemeModalConfig;
}

export interface ThemeConfiguration {
  layout: "sidebar" | "bottom";
  pagination: ThemePaginationConfig;
  viewer: ThemeViewerConfig;
  segments: ThemeSegmentsConfig;
  modal: ThemeModalConfig;
}

export interface ProcessingProgress {
  stage:
    | "uploading"
    | "reading"
    | "generating_pages"
    | "creating_previews"
    | "finalizing"
    | "done"
    | "failed";
  totalPages: number;
  completedPages: number;
  message?: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApiErrorBody {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessBody<T> | ApiErrorBody;

/** Provider-independent OCR/layout block used by AI article detection. */
export type AiDocumentBlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "caption"
  | "table"
  | "unknown";

export interface AiDocumentBlock {
  id: string;
  type: AiDocumentBlockType;
  text: string;
  coordinates: SegmentCoordinates;
  readingOrder?: number;
  confidence?: number | null;
  originalLabel?: string;
}

export type AiJobStatus =
  | "queued"
  | "submitted"
  | "processing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "rejected";

export type AiSuggestionStatus = "pending" | "accepted" | "rejected";

export interface SuggestedArticle {
  title: string;
  coordinates: SegmentCoordinates;
  sourceBlockIds: string[];
  confidence: number | null;
  reviewRequired: boolean;
  extractedText?: string;
}

export interface AiSuggestionDto {
  id: string;
  editionId: string;
  pageId: string;
  aiJobId: string;
  provider: "sarvam";
  title: string;
  coordinates: SegmentCoordinates;
  extractedText?: string;
  sourceBlockIds: string[];
  confidence: number | null;
  reviewRequired: boolean;
  status: AiSuggestionStatus;
  acceptedSegmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiProcessingJobDto {
  id: string;
  editionId: string;
  pageId: string;
  provider: "sarvam";
  providerJobId?: string | null;
  status: AiJobStatus;
  stage: string;
  language: string;
  sourceImageHash: string;
  cached: boolean;
  errorMessage?: string | null;
  estimatedCostInr?: number | null;
  suggestionCount?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface AiUsageSummary {
  enabled: boolean;
  configured: boolean;
  requestsThisMonth: number;
  pagesAnalyzedThisMonth: number;
  cachedResultsServed: number;
  estimatedUsageInr: number;
  monthlyBudgetInr: number;
  dailyRequestsUsed: number;
  maxRequestsPerDay: number;
  dailyPagesUsed: number;
  maxPagesPerDay: number;
  remainingBudgetInr: number;
}

export const AI_PROCESSING_VERSION = "v1";
