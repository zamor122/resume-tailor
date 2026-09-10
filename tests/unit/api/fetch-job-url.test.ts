import { describe, it, expect } from "vitest";

describe("Job URL Fetching logic", () => {
  it("validates incoming URL correctly", () => {
    const validHttp = "http://example.com/job/123";
    const validHttps = "https://www.builtinla.com/job/staff-fullstack-engineer";
    const invalidUrl = "not-a-url";

    expect(() => new URL(validHttp)).not.toThrow();
    expect(() => new URL(validHttps)).not.toThrow();
    expect(() => new URL(invalidUrl)).toThrow();
  });

  it("extracts and strips HTML to plain text cleanly", () => {
    const rawHtml = `
      <html>
        <head><title>Senior Engineer Job</title><script>alert('test')</script></head>
        <body>
          <header>Navigation Header</header>
          <main>
            <h1>Senior Software Engineer</h1>
            <p>We are seeking a <strong>talented engineer</strong> with experience in TypeScript and React.</p>
            <ul>
              <li>5+ years of experience</li>
              <li>Strong problem solving</li>
            </ul>
          </main>
          <footer>Footer Copyright 2026</footer>
        </body>
      </html>
    `;

    let text = rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "");

    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li|tr|h[1-6]|section|article|main|aside|blockquote)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");

    expect(text).toContain("Senior Software Engineer");
    expect(text).toContain("5+ years of experience");
    expect(text).not.toContain("alert('test')");
    expect(text).not.toContain("Navigation Header");
    expect(text).not.toContain("Footer Copyright");
  });

  it("trims boilerplate EEO and privacy sections without cutting role details", () => {
    const content = `
      About the Role
      You will build reliable systems with TypeScript and Node.js.
      
      Requirements:
      - 5+ years building distributed applications.
      - Experience with cloud architecture.
      
      Equal Employment Opportunity
      Our company is an equal opportunity employer...
    `;

    const END_SENTINELS = ["Equal Employment Opportunity", "EEO Policy", "Privacy Policy"];
    let minIdx = content.length;
    for (const s of END_SENTINELS) {
      const idx = content.toLowerCase().indexOf(s.toLowerCase());
      if (idx > 100 && idx < minIdx) minIdx = idx;
    }
    const trimmed = content.slice(0, minIdx).trim();

    expect(trimmed).toContain("About the Role");
    expect(trimmed).toContain("5+ years building distributed applications");
    expect(trimmed).not.toContain("Our company is an equal opportunity employer");
  });
});
