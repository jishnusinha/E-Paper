import type {
  AiProcessingJobDto,
  AiSuggestionDto,
  AiUsageSummary,
} from "@epaper/shared";
import type { Segment } from "@/types";
import { api, getData } from "./api";

export const aiApi = {
  detect(pageId: string, body?: { language?: string; force?: boolean }) {
    return getData<{
      job: AiProcessingJobDto;
      reused: boolean;
      cached: boolean;
    }>(api.post(`/admin/pages/${pageId}/ai-detect`, body ?? {}));
  },

  job(pageId: string) {
    return getData<{
      job: AiProcessingJobDto | null;
      ai: { enabled: boolean; configured: boolean };
    }>(api.get(`/admin/pages/${pageId}/ai-job`));
  },

  suggestions(pageId: string) {
    return getData<AiSuggestionDto[]>(
      api.get(`/admin/pages/${pageId}/ai-suggestions`)
    );
  },

  updateSuggestion(
    suggestionId: string,
    data: { title?: string; coordinates?: AiSuggestionDto["coordinates"] }
  ) {
    return getData<AiSuggestionDto>(
      api.patch(`/admin/ai-suggestions/${suggestionId}`, data)
    );
  },

  accept(suggestionId: string) {
    return getData<{
      suggestion: AiSuggestionDto;
      segment: Segment;
      alreadyAccepted: boolean;
    }>(api.post(`/admin/ai-suggestions/${suggestionId}/accept`));
  },

  reject(suggestionId: string) {
    return getData<AiSuggestionDto>(
      api.post(`/admin/ai-suggestions/${suggestionId}/reject`)
    );
  },

  acceptAll(pageId: string) {
    return getData<
      Array<{
        suggestion: AiSuggestionDto;
        segment: Segment;
        alreadyAccepted: boolean;
      }>
    >(api.post(`/admin/pages/${pageId}/ai-suggestions/accept-all`));
  },

  rejectAll(pageId: string) {
    return getData<AiSuggestionDto[]>(
      api.post(`/admin/pages/${pageId}/ai-suggestions/reject-all`)
    );
  },

  usage() {
    return getData<AiUsageSummary>(api.get("/admin/ai/usage"));
  },
};
