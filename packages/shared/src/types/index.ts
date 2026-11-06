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
