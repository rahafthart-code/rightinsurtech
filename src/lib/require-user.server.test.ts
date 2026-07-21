import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getClaims = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { getClaims } })),
}));

import { requireUser } from "./require-user.server";

function req(headers?: Record<string, string>) {
  return new Request("https://example.com/api/whatever", { headers });
}

describe("requireUser", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    getClaims.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects a missing Authorization header", async () => {
    const result = await requireUser(req());
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("rejects a non-Bearer Authorization header", async () => {
    const result = await requireUser(req({ authorization: "Basic abc123" }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns 500 when Supabase env vars are missing", async () => {
    delete process.env.SUPABASE_URL;
    const result = await requireUser(req({ authorization: "Bearer sometoken" }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
  });

  it("rejects a token Supabase reports as invalid", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid") });
    const result = await requireUser(req({ authorization: "Bearer badtoken" }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("rejects a token with no subject claim", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
    const result = await requireUser(req({ authorization: "Bearer sometoken" }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns the userId for a valid token", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-123" } }, error: null });
    const result = await requireUser(req({ authorization: "Bearer goodtoken" }));
    expect(result).toEqual({ userId: "user-123" });
  });
});
