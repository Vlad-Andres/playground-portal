/** The policy every custom component frame enforces on itself. */
export const SANDBOX_CSP =
  "default-src 'none'; script-src 'unsafe-inline' {scriptOrigins}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

export type SandboxMessage =
  | { pg: "ready" }
  | { pg: "height"; value: number }
  | { pg: "error"; message: string }
  | { pg: "done"; score?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

/** Accept only the exact messages the frame is allowed to send. */
export function parseSandboxMessage(data: unknown): SandboxMessage | null {
  if (!isRecord(data) || typeof data.pg !== "string") return null;

  if (data.pg === "ready") {
    return hasOnlyKeys(data, ["pg"]) ? { pg: "ready" } : null;
  }
  if (data.pg === "height") {
    return hasOnlyKeys(data, ["pg", "value"]) &&
      typeof data.value === "number" &&
      Number.isFinite(data.value)
      ? { pg: "height", value: data.value }
      : null;
  }
  if (data.pg === "error") {
    return hasOnlyKeys(data, ["pg", "message"]) && typeof data.message === "string"
      ? { pg: "error", message: data.message }
      : null;
  }
  if (data.pg === "done") {
    if (!("score" in data)) return hasOnlyKeys(data, ["pg"]) ? { pg: "done" } : null;
    return hasOnlyKeys(data, ["pg", "score"]) &&
      typeof data.score === "number" &&
      Number.isFinite(data.score)
      ? { pg: "done", score: data.score }
      : null;
  }
  return null;
}

/** A message counts only when it comes from the frame that this component owns. */
export function acceptSandboxMessage(
  source: unknown,
  frame: unknown,
  data: unknown,
): SandboxMessage | null {
  if (!frame || source !== frame) return null;
  return parseSandboxMessage(data);
}

/** Keep a frame's reported height inside the range the layout can absorb. */
export function clampHeight(value: number): number {
  if (!Number.isFinite(value)) return 360;
  return Math.min(900, Math.max(200, Math.round(value)));
}

const BOOTSTRAP = `<script>
(function () {
  var send = function (message) { parent.postMessage(message, "*"); };
  window.pg = {
    done: function (score) {
      if (typeof score === "number") send({ pg: "done", score: score });
      else send({ pg: "done" });
    }
  };
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (event.source !== parent || !data || data.pg !== "theme") return;
    if (data.value !== "light" && data.value !== "dark") return;
    document.documentElement.dataset.pgTheme = data.value;
    document.documentElement.style.colorScheme = data.value;
  });
  var reportHeight = function () {
    var height = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );
    send({ pg: "height", value: height });
  };
  window.addEventListener("load", function () { send({ pg: "ready" }); reportHeight(); });
  window.addEventListener("error", function (event) {
    send({ pg: "error", message: String(event.message || "Unknown error") });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    send({ pg: "error", message: String((reason && reason.message) || reason || "Unhandled rejection") });
  });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(reportHeight).observe(document.documentElement);
  } else {
    window.addEventListener("resize", reportHeight);
  }
})();
</script>`;

/** Build the full document for a custom component: CSP first, then the bridge, then the model's HTML. */
export function wrapCustomHtml(html: string, options: { scriptOrigins?: string[] } = {}): string {
  const origins = (options.scriptOrigins ?? [])
    .map((origin) => origin.replace(/"/g, "&quot;"))
    .join(" ");
  const csp = SANDBOX_CSP.replace("{scriptOrigins}", origins).replace(/\s{2,}/g, " ").trim();

  return `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root {
  color-scheme: light dark;
  --pg-canvas: light-dark(#f3efe6, #17152b);
  --pg-surface: light-dark(#fbf9f4, #1f1c38);
  --pg-ink: light-dark(#1d1a36, #f3efe6);
  --pg-muted: light-dark(#55516e, #c4c0dc);
  --pg-line: light-dark(#ded7c9, #46427a);
  --pg-indigo: light-dark(#4a3fd0, #b7affa);
  --pg-lilac: light-dark(#e6e2fb, #2e2a5c);
  --pg-coral: light-dark(#a13c28, #f59a80);
  --pg-lime: #e3f36a;
}
body { background: var(--pg-canvas); color: var(--pg-ink); font-family: system-ui, sans-serif; }
</style>
</head>
<body>
${BOOTSTRAP}
${html}
</body>
</html>`;
}
