import { describe, expect, it } from "vitest";
import { loginSchema } from "@epaper/shared";

describe("auth validation", () => {
  it("accepts valid login payloads", () => {
    const parsed = loginSchema.parse({
      email: "admin@example.com",
      password: "ChangeMeStrong123!",
    });
    expect(parsed.email).toBe("admin@example.com");
  });

  it("rejects short passwords", () => {
    expect(() =>
      loginSchema.parse({ email: "admin@example.com", password: "short" })
    ).toThrow();
  });
});
