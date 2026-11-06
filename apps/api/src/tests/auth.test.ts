import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@epaper/shared";

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

  it("accepts valid register payloads", () => {
    const parsed = registerSchema.parse({
      name: "Jane Editor",
      email: "jane@example.com",
      password: "ChangeMeStrong123!",
    });
    expect(parsed.name).toBe("Jane Editor");
  });

  it("rejects register payloads without a name", () => {
    expect(() =>
      registerSchema.parse({
        name: "",
        email: "jane@example.com",
        password: "ChangeMeStrong123!",
      })
    ).toThrow();
  });
});
