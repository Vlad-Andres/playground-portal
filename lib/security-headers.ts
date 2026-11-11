/** Response headers applied to every route (see next.config.ts). */
export function contentSecurityPolicy(development: boolean): string {
  // `next dev` needs eval for React Refresh; production never gets it.
  const scripts = development ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scripts}`,
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * The policy for published courses under /courses/*: the template's own CSP. Courses run the in-browser
 * PostgreSQL ('wasm-unsafe-eval'), call Gemini with the learner's own key, and show custom components in
 * sandboxed `srcdoc` frames (which inherit this policy, so it must never allow 'unsafe-eval' in production).
 */
export function courseContentSecurityPolicy(development: boolean): string {
  const scripts = development
    ? "'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'"
    : "'self' 'unsafe-inline' 'wasm-unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://generativelanguage.googleapis.com",
    "frame-src 'self' blob: data:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}

function commonHeaders(): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Robots-Tag", value: "noindex" },
  ];
}

export function courseSecurityHeaders(development: boolean): { key: string; value: string }[] {
  return [{ key: "Content-Security-Policy", value: courseContentSecurityPolicy(development) }, ...commonHeaders()];
}

/** Every path except /courses/* gets the portal headers; /courses/* gets the course headers. */
export function headerRules(development: boolean): { source: string; headers: { key: string; value: string }[] }[] {
  return [
    { source: "/:path((?!courses(?:/|$)).*)", headers: securityHeaders(development) },
    { source: "/courses/:path*", headers: courseSecurityHeaders(development) },
  ];
}

export function securityHeaders(development: boolean): { key: string; value: string }[] {
  return [{ key: "Content-Security-Policy", value: contentSecurityPolicy(development) }, ...commonHeaders()];
}
