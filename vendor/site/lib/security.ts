export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' lets the in-browser PostgreSQL (PGlite) compile its WebAssembly.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com",
  // Custom components are inline `srcdoc` documents; they never navigate the page.
  "frame-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");
