import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

const TERMINAL = new Set([
  "completed",
  "partially_completed",
  "failed",
  "rejected",
]);

export type SarvamJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed"
  | "rejected"
  | string;

export interface SarvamSubmitResult {
  jobId: string;
  status: SarvamJobStatus;
  runId?: string;
}

export interface SarvamStatusResult {
  jobId: string;
  status: SarvamJobStatus;
  usage?: {
    pages_total?: number;
    pages_processed?: number;
    pages_succeeded?: number;
    pages_failed?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface SarvamDownloadUrl {
  method?: string;
  url: string;
}

export function isTerminalSarvamStatus(status: string): boolean {
  return TERMINAL.has(status.toLowerCase());
}

function getApiKey(): string {
  const key = env.SARVAM_API_KEY?.trim();
  if (!key) {
    throw new AppError(
      "Sarvam AI is not configured. Set SARVAM_API_KEY.",
      503,
      "AI_UNAVAILABLE"
    );
  }
  return key;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("Sarvam request timed out", 504, "AI_TIMEOUT");
    }
    throw new AppError(
      `Sarvam network error: ${error instanceof Error ? error.message : "unknown"}`,
      502,
      "AI_NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timer);
  }
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      detail?: string;
      title?: string;
      message?: string;
    };
    return body.detail || body.title || body.message || response.statusText;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

function mapHttpError(status: number, detail: string): AppError {
  if (status === 401 || status === 403) {
    return new AppError(
      "Sarvam authentication failed. Check SARVAM_API_KEY.",
      502,
      "AI_AUTH_ERROR",
      { detail }
    );
  }
  if (status === 402) {
    return new AppError(
      "Insufficient Sarvam credits or billing entitlement.",
      402,
      "AI_INSUFFICIENT_CREDITS",
      { detail }
    );
  }
  if (status === 429) {
    return new AppError(
      "Sarvam rate limit exceeded. Try again later.",
      429,
      "AI_RATE_LIMIT",
      { detail }
    );
  }
  if (status === 413) {
    return new AppError("Page image is too large for Sarvam.", 413, "AI_FILE_TOO_LARGE", {
      detail,
    });
  }
  if (status >= 500) {
    return new AppError(
      "Sarvam service is temporarily unavailable.",
      503,
      "AI_PROVIDER_UNAVAILABLE",
      { detail }
    );
  }
  return new AppError(`Sarvam request failed: ${detail}`, 502, "AI_PROVIDER_ERROR", {
    detail,
    status,
  });
}

/**
 * Direct HTTP client for Sarvam Document AI.
 * Uses multipart form fields so `output_format=json` is always sent
 * (JS SDK ≤1.1.12 does not transmit output_format for parse()).
 */
export class SarvamClient {
  constructor(
    private readonly baseUrl = env.SARVAM_BASE_URL.replace(/\/$/, ""),
    private readonly timeoutMs = 60_000
  ) {}

  async submitParse(params: {
    filename: string;
    buffer: Buffer;
    mimeType: string;
    language: string;
  }): Promise<SarvamSubmitResult> {
    const key = getApiKey();
    const form = new FormData();
    const blob = new Blob([new Uint8Array(params.buffer)], {
      type: params.mimeType,
    });
    form.append("file", blob, params.filename);
    form.append("language", params.language);
    form.append("output_format", "json");

    const response = await this.withTransientRetry(() =>
      fetchWithTimeout(
        `${this.baseUrl}/doc-ai/v1/job/parse`,
        {
          method: "POST",
          headers: { "api-subscription-key": key },
          body: form,
        },
        this.timeoutMs
      )
    );

    if (!response.ok) {
      throw mapHttpError(response.status, await parseErrorBody(response));
    }

    const data = (await response.json()) as {
      job_id: string;
      status: string;
      run_id?: string;
    };

    if (!data.job_id) {
      throw new AppError(
        "Sarvam did not return a job_id",
        502,
        "AI_INVALID_RESPONSE"
      );
    }

    return {
      jobId: data.job_id,
      status: data.status,
      runId: data.run_id,
    };
  }

  async getStatus(jobId: string): Promise<SarvamStatusResult> {
    const key = getApiKey();
    const response = await this.withTransientRetry(() =>
      fetchWithTimeout(
        `${this.baseUrl}/doc-ai/v1/job/${encodeURIComponent(jobId)}/status`,
        {
          method: "GET",
          headers: { "api-subscription-key": key },
        },
        this.timeoutMs
      )
    );

    if (!response.ok) {
      throw mapHttpError(response.status, await parseErrorBody(response));
    }

    const data = (await response.json()) as SarvamStatusResult & {
      job_id?: string;
    };

    return {
      jobId: data.job_id || jobId,
      status: data.status,
      usage: data.usage,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async getDownloadUrl(jobId: string): Promise<SarvamDownloadUrl> {
    const key = getApiKey();
    const response = await this.withTransientRetry(() =>
      fetchWithTimeout(
        `${this.baseUrl}/doc-ai/v1/job/${encodeURIComponent(jobId)}/download-url`,
        {
          method: "GET",
          headers: { "api-subscription-key": key },
        },
        this.timeoutMs
      )
    );

    if (!response.ok) {
      throw mapHttpError(response.status, await parseErrorBody(response));
    }

    const data = (await response.json()) as SarvamDownloadUrl;
    if (!data.url) {
      throw new AppError(
        "Sarvam download URL missing",
        502,
        "AI_INVALID_RESPONSE"
      );
    }
    return data;
  }

  async downloadZip(url: string, maxBytes = 25 * 1024 * 1024): Promise<Buffer> {
    const response = await fetchWithTimeout(url, { method: "GET" }, this.timeoutMs);
    if (!response.ok) {
      throw new AppError(
        `Failed to download Sarvam results (${response.status})`,
        502,
        "AI_DOWNLOAD_FAILED"
      );
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > maxBytes) {
      throw new AppError(
        "Sarvam result ZIP exceeds size limit",
        502,
        "AI_DOWNLOAD_TOO_LARGE"
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      throw new AppError(
        "Sarvam result ZIP exceeds size limit",
        502,
        "AI_DOWNLOAD_TOO_LARGE"
      );
    }
    return Buffer.from(arrayBuffer);
  }

  /** Retry GET/status-style calls only — never auto-retry paid submissions. */
  private async withTransientRetry(
    fn: () => Promise<Response>,
    attempts = 3
  ): Promise<Response> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const response = await fn();
        if (response.status === 429 || response.status >= 500) {
          if (i === attempts - 1) return response;
          await sleep(500 * (i + 1));
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (i === attempts - 1) break;
        await sleep(500 * (i + 1));
      }
    }
    if (lastError instanceof AppError) throw lastError;
    throw new AppError(
      `Sarvam request failed after retries`,
      502,
      "AI_NETWORK_ERROR",
      { cause: lastError instanceof Error ? lastError.message : String(lastError) }
    );
  }
}

export const sarvamClient = new SarvamClient();
