import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/env.js", () => ({
  env: {
    SARVAM_API_KEY: "test-key",
    SARVAM_BASE_URL: "https://api.sarvam.ai",
    SARVAM_AI_ENABLED: true,
  },
}));

import { SarvamClient } from "./sarvamClient.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("SarvamClient", () => {
  it("submits parse with output_format=json", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ job_id: "job-1", status: "pending", run_id: "run-1" }),
        { status: 201 }
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new SarvamClient("https://api.sarvam.ai", 5000);
    const result = await client.submitParse({
      filename: "page.png",
      buffer: Buffer.from("fake-image"),
      mimeType: "image/png",
      language: "en-IN",
    });

    expect(result.jobId).toBe("job-1");
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "api-subscription-key": "test-key",
    });
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get("language")).toBe("en-IN");
    expect(form.get("output_format")).toBe("json");
  });

  it("maps insufficient credits (402)", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: "no credits" }), { status: 402 })
    ) as typeof fetch;

    const client = new SarvamClient();
    await expect(
      client.submitParse({
        filename: "page.png",
        buffer: Buffer.from("x"),
        mimeType: "image/png",
        language: "en-IN",
      })
    ).rejects.toMatchObject({ code: "AI_INSUFFICIENT_CREDITS" });
  });

  it("reads completed status", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          job_id: "job-1",
          status: "completed",
          usage: { pages_total: 1, pages_processed: 1 },
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const client = new SarvamClient();
    const status = await client.getStatus("job-1");
    expect(status.status).toBe("completed");
    expect(status.usage?.pages_processed).toBe(1);
  });

  it("maps rate limits", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: "slow down" }), { status: 429 })
    ) as typeof fetch;

    const client = new SarvamClient();
    await expect(client.getStatus("job-1")).rejects.toMatchObject({
      code: "AI_RATE_LIMIT",
    });
  });
});
