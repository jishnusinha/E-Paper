import type {
  ProcessingProgress,
  ProcessingStatus,
  PublicationStatus,
  SegmentCoordinates,
  ThemeConfiguration,
} from "@epaper/shared";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Edition {
  id: string;
  title: string;
  publicationDate: string;
  originalPdfPublicId?: string | null;
  originalPdfUrl?: string | null;
  totalPages: number;
  themeId?: string | null;
  themeKey?: string;
  themeConfig?: ThemeConfiguration;
  processingStatus: ProcessingStatus;
  publicationStatus: PublicationStatus;
  processingProgress?: ProcessingProgress;
  processingError?: string | null;
  publishedAt?: string | null;
  pageCount?: number;
  segmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewspaperPage {
  id: string;
  editionId: string;
  sourcePdfPageNumber?: number;
  displayPageNumber: number;
  displayOrder: number;
  title?: string;
  pdfWidth?: number;
  pdfHeight?: number;
  imageWidth: number;
  imageHeight: number;
  imagePublicId?: string;
  imageUrl: string;
  thumbnailUrl: string;
  isVisible?: boolean;
  segmentCount?: number;
}

export interface Segment {
  id: string;
  editionId?: string;
  pageId: string;
  title?: string;
  coordinates: SegmentCoordinates;
  hoverColor?: string;
  hoverOpacity?: number;
  isEnabled?: boolean;
  clientId?: string;
}

export interface ThemeInfo {
  id: string;
  key: string;
  name: string;
  description?: string;
  configuration: ThemeConfiguration;
  isActive: boolean;
}

export interface DashboardStats {
  totalEditions: number;
  publishedEditions: number;
  draftEditions: number;
  totalPages: number;
  totalSegments: number;
}

export interface CropResult {
  segmentId: string;
  title?: string;
  crop: { x: number; y: number; width: number; height: number };
  url: string;
  aspectRatio?: number;
}

export interface EditionDateSummary {
  date: string;
  title: string;
  totalPages?: number;
  coverThumbnailUrl?: string | null;
}

export interface PublicArticle {
  id: string;
  title: string;
  pageId: string;
  pageNumber: number;
  pageTitle: string;
  imageUrl: string;
  aspectRatio: number;
}

export interface PublicSection {
  pageId: string;
  pageNumber: number;
  title: string;
  thumbnailUrl: string;
  imageUrl: string;
  articleCount: number;
}

export interface EditionArticlesFeed {
  edition: Pick<
    Edition,
    | "id"
    | "title"
    | "publicationDate"
    | "totalPages"
    | "themeKey"
    | "themeConfig"
    | "publishedAt"
  >;
  sections: PublicSection[];
  articles: PublicArticle[];
}
