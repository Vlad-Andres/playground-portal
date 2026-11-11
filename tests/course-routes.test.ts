import { describe, expect, it, vi } from "vitest";

// unstable_cache needs Next's request context; in tests it simply calls through.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));

import { buildSiteData } from "@core/site";
import { memoryStore } from "@/lib/jobs/store";
import { contentSecurityPolicy, courseSecurityHeaders, headerRules, securityHeaders } from "@/lib/security-headers";
import { courseTag, loadSite } from "@/lib/sites/load";
import { writeSite } from "@/lib/sites/store";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

function csp(headers: { key: string; value: string }[]): string {
  return headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
}

describe("course security headers", () => {
  it("use the template's CSP with framing forbidden", () => {
    const policy = csp(courseSecurityHeaders(false));
    expect(policy).toContain("'wasm-unsafe-eval'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("frame-src 'self' blob: data:");
    expect(policy).toContain("connect-src 'self' https://generativelanguage.googleapis.com");
    expect(policy).toContain("form-action 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("keep the portal's own headers unchanged for its pages", () => {
    expect(csp(securityHeaders(false))).toBe(contentSecurityPolicy(false));
    expect(csp(securityHeaders(false))).not.toContain("wasm-unsafe-eval");
    for (const headers of [securityHeaders(false), courseSecurityHeaders(false)]) {
      expect(headers.map((header) => header.key)).toEqual(["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "X-Robots-Tag"]);
    }
  });

  it("send each path exactly one CSP", () => {
    const [portal, courses] = headerRules(false);
    const portalSource = new RegExp(`^${portal.source.replace("/:path(", "/(")}$`);
    for (const path of ["/", "/jobs/x", "/api/jobs", "/coursesx"]) expect(portalSource.test(path), path).toBe(true);
    for (const path of ["/courses", "/courses/demo-12345678/", "/courses/demo-12345678/lectures/intro"]) {
      expect(portalSource.test(path), path).toBe(false);
    }
    expect(courses.source).toBe("/courses/:path*");
  });
});

describe("loadSite", () => {
  const key = "demo-12345678";
  const site = buildSiteData({ key, course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });

  it("returns a stored course", async () => {
    const store = memoryStore();
    await writeSite(store, key, site, { jobId: "12345678", publishedAt: "2026-11-11T10:00:00Z" });
    expect((await loadSite(key, store))?.course.title).toBe("Demo course");
    expect(courseTag(key)).toBe("course:demo-12345678");
  });

  it.each([["../x"], ["ABC-1234abcd"], ["demo"], ["courses/demo-12345678"]])("returns null for %j without reading the store", async (bad) => {
    const store = memoryStore();
    const read = vi.spyOn(store, "read");
    expect(await loadSite(bad, store)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it("returns null for an unknown course", async () => {
    expect(await loadSite("unknown-abcd1234", memoryStore())).toBeNull();
  });
});
