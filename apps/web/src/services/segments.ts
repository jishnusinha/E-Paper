import { api, getData } from "./api";
import type { CropResult, Segment } from "@/types";
import type { SegmentCoordinates } from "@epaper/shared";

export const segmentsApi = {
  list: (pageId: string) =>
    getData<Segment[]>(api.get(`/admin/pages/${pageId}/segments`)),
  create: (
    pageId: string,
    data: {
      title?: string;
      coordinates: SegmentCoordinates;
      hoverColor?: string;
      hoverOpacity?: number;
    }
  ) => getData<Segment>(api.post(`/admin/pages/${pageId}/segments`, data)),
  update: (segmentId: string, data: Partial<Segment>) =>
    getData<Segment>(api.patch(`/admin/segments/${segmentId}`, data)),
  remove: (segmentId: string) =>
    getData<{ ok: boolean }>(api.delete(`/admin/segments/${segmentId}`)),
  batch: (
    pageId: string,
    payload: {
      create?: Array<{
        clientId?: string;
        title?: string;
        coordinates: SegmentCoordinates;
        hoverColor?: string;
        hoverOpacity?: number;
        isEnabled?: boolean;
      }>;
      update?: Array<{ id: string; data: Partial<Segment> }>;
      delete?: string[];
    }
  ) =>
    getData<{
      segments: Segment[];
      created: Segment[];
      updated: Segment[];
      deleted: string[];
      clientIdMap: Record<string, string>;
    }>(api.put(`/admin/pages/${pageId}/segments/batch`, payload)),
  crop: (segmentId: string) =>
    getData<CropResult>(api.get(`/admin/segments/${segmentId}/crop`)),
};
