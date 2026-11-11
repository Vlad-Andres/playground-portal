import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

describe("securityHeaders", () => {
  const names = securityHeaders(false).map((header) => header.key);
  it("sets the four required headers", () => {
    for (const name of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "X-Robots-Tag"]) {
      expect(names).toContain(name);
    }
  });
  it("forbids framing and foreign scripts in production", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("unsafe-eval");
  });
  it("allows eval only for the development server", () => {
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
  });
});
