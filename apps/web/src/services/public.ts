import { api, getData } from "./api";
import type {
  CropResult,
  Edition,
  EditionArticlesFeed,
  EditionDateSummary,
  NewspaperPage,
  Segment,
} from "@/types";

export const publicApi = {
  latest: () => getData<Edition | null>(api.get("/public/editions/latest")),
  dates: () =>
    getData<EditionDateSummary[]>(api.get("/public/editions/dates")),
  byDate: (date: string) =>
    getData<Edition>(api.get(`/public/editions/${date}`)),
  pages: (date: string) =>
    getData<NewspaperPage[]>(api.get(`/public/editions/${date}/pages`)),
  articles: (date: string) =>
    getData<EditionArticlesFeed>(
      api.get(`/public/editions/${date}/articles`)
    ),
  segments: (pageId: string) =>
    getData<Segment[]>(api.get(`/public/pages/${pageId}/segments`)),
  crop: (segmentId: string) =>
    getData<CropResult>(api.get(`/public/segments/${segmentId}/crop`)),
};
