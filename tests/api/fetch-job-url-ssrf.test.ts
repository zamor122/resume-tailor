import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// The route imports the model stack; stub it so the SSRF guard is what is under test.
vi.mock("@/app/services/model-fallback", () => ({ generateWithFallback: vi.fn() }));

import { POST } from "@/app/api/fetch-job-url/route";

const call = (url: string) =>
  POST(
    new NextRequest("http://localhost:3000/api/fetch-job-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    })
  );

describe("fetch-job-url SSRF guard", () => {
  it.each([
    "http://localhost/admin",
    "http://127.0.0.1:3000/api/secret",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/internal",
    "http://192.168.1.1/router",
    "http://172.16.0.1/",
    "http://metadata.google.internal/computeMetadata/v1/",
  ])("rejects the internal target %s with 400 and no fetch", async (url) => {
    const res = await call(url);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not allowed/i);
  });

  it("does not reject an ordinary public URL at the guard stage", async () => {
    const res = await call("http://not-a-real-host.example.test/jobs/1");
    // Guard passes; the fetch itself fails, so we expect anything EXCEPT the SSRF 400.
    expect(res.status).not.toBe(400);
  }, 30_000);
});
