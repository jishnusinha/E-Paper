import { api, getData } from "./api";
import type { DashboardStats, Edition, NewspaperPage, Segment } from "@/types";

export const editionsApi = {
  stats: () => getData<DashboardStats>(api.get("/admin/stats")),
  list: (params?: Record<string, string | number>) =>
    getData<{
      items: Edition[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(api.get("/admin/editions", { params })),
  get: (id: string) => getData<Edition>(api.get(`/admin/editions/${id}`)),
  create: (form: FormData) =>
    getData<Edition>(
      api.post("/admin/editions", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
  update: (id: string, data: Partial<Edition>) =>
    getData<Edition>(api.patch(`/admin/editions/${id}`, data)),
  remove: (id: string) =>
    getData<{ ok: boolean }>(api.delete(`/admin/editions/${id}`)),
  publish: (id: string) =>
    getData<Edition>(api.post(`/admin/editions/${id}/publish`)),
  unpublish: (id: string) =>
    getData<Edition>(api.post(`/admin/editions/${id}/unpublish`)),
  processingStatus: (id: string) =>
    getData<{
      processingStatus: Edition["processingStatus"];
      processingProgress: Edition["processingProgress"];
      processingError: string | null;
      totalPages: number;
    }>(api.get(`/admin/editions/${id}/processing-status`)),
  retryProcessing: (id: string) =>
    getData<Edition>(api.post(`/admin/editions/${id}/retry-processing`)),
  preview: (id: string) =>
    getData<{
      edition: Edition;
      pages: NewspaperPage[];
      segments: Segment[];
    }>(api.get(`/admin/editions/${id}/preview`)),
  setTheme: (id: string, themeId: string) =>
    getData<{ themeId: string; themeKey: string; themeConfig: unknown }>(
      api.patch(`/admin/editions/${id}/theme`, { themeId })
    ),
  pages: (id: string) =>
    getData<NewspaperPage[]>(api.get(`/admin/editions/${id}/pages`)),
  reorderPages: (id: string, pageIds: string[]) =>
    getData<NewspaperPage[]>(
      api.patch(`/admin/editions/${id}/pages/reorder`, { pageIds })
    ),
  updatePage: (pageId: string, data: Partial<NewspaperPage>) =>
    getData<NewspaperPage>(api.patch(`/admin/pages/${pageId}`, data)),
};
