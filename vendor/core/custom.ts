import type { Problem } from "./validate";

/** The most HTML a single custom component may contain. */
export const CUSTOM_HTML_MAX = 60_000;

const FIX = "Keep the component self-contained: inline HTML, CSS and JS only, no network, no storage.";

interface Rule {
  test: RegExp;
  message: string;
}

const RULES: Rule[] = [
  { test: /<script\b[^>]*\bsrc\s*=/i, message: "A <script> element may not load an external source." },
  { test: /<link\b/i, message: "A <link> element may not load an external resource." },
  { test: /<(?:iframe|frame|object|embed)\b/i, message: "Embedded documents and objects are not allowed." },
  { test: /<form\b/i, message: "Forms are not allowed." },
  { test: /<base\b/i, message: "A <base> element is not allowed." },
  { test: /<meta\b[^>]*\bhttp-equiv\b/i, message: "A <meta http-equiv> element is not allowed." },
  { test: /\bfetch\s*\(/i, message: "Network requests with fetch() are not allowed." },
  { test: /\bXMLHttpRequest\b/i, message: "Network requests with XMLHttpRequest are not allowed." },
  { test: /\bWebSocket\b/i, message: "WebSocket connections are not allowed." },
  { test: /\bEventSource\b/i, message: "EventSource connections are not allowed." },
  { test: /\bsendBeacon\b/i, message: "Network requests with sendBeacon() are not allowed." },
  { test: /\bimportScripts\b/i, message: "importScripts() is not allowed." },
  { test: /\bimport\s*\(/i, message: "Dynamic import() is not allowed." },
  { test: /\beval\s*\(/i, message: "eval() is not allowed." },
  { test: /\bnew\s+Function\b/i, message: "new Function is not allowed." },
  { test: /\bdocument\.cookie\b/i, message: "Reading or writing document.cookie is not allowed." },
  { test: /\blocalStorage\b/i, message: "localStorage is not allowed." },
  { test: /\bsessionStorage\b/i, message: "sessionStorage is not allowed." },
  { test: /\bindexedDB\b/i, message: "indexedDB is not allowed." },
  { test: /\btop\s*\./i, message: "The component may not reach the top window." },
  { test: /\bparent\.location\b/i, message: "The component may not navigate the parent window." },
  { test: /\bwindow\.open\s*\(/i, message: "window.open() is not allowed." },
  {
    test: /(?:\b(?:src|href)\s*=\s*["']?\s*|url\(\s*["']?\s*)https?:\/\//i,
    message: "External URLs in attributes are not allowed.",
  },
];

/** Reject anything in a custom component that reaches the network, storage or the page around it. */
export function scanCustomHtml(html: string): Problem[] {
  return RULES.filter((rule) => rule.test.test(html)).map((rule) => ({
    code: "E110",
    severity: "error",
    file: "",
    path: "html",
    message: rule.message,
    fix: FIX,
  }));
}
