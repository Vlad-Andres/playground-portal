import type { AssistantSelection } from "@site/lib/assistant/prompt";

export interface ProxyHistoryTurn {
  role: "user" | "model";
  text: string;
}

export interface ProxyReplyRequest {
  question: string;
  context: string;
  courseTitle: string;
  selection?: AssistantSelection;
  history?: ProxyHistoryTurn[];
}

export interface ProxyReply {
  text: string;
  truncated: boolean;
}

export type ProxyErrorKind = "auth" | "rate" | "busy" | "network" | "aborted" | "blocked" | "other";

export class ProxyError extends Error {
  constructor(
    readonly kind: ProxyErrorKind,
    message: string,
  ) {
    super(message);
  }
}

function parseError(data: unknown): { kind: ProxyErrorKind; error: string } {
  if (typeof data !== "object" || data === null) return { kind: "other", error: "Something went wrong." };
  const kind = (data as Record<string, unknown>).kind;
  const error = (data as Record<string, unknown>).error;
  return {
    kind:
      typeof kind === "string" && ["auth", "rate", "busy", "network", "aborted", "blocked", "other"].includes(kind)
        ? (kind as ProxyErrorKind)
        : "other",
    error: typeof error === "string" ? error : "Something went wrong.",
  };
}

export async function streamProxyReply(
  request: ProxyReplyRequest,
  signal: AbortSignal,
  onText: (text: string) => void,
): Promise<ProxyReply> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const { kind, error } = parseError(body);
    throw new ProxyError(kind, error);
  }

  if (!response.body) {
    throw new ProxyError("network", "No response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (typeof parsed.text === "string") {
            text = parsed.text;
            onText(text);
          }
          if (parsed.truncated === true) truncated = true;
        } catch {
          // Ignore malformed SSE events.
        }
      }
    }
  } catch (error) {
    if (signal.aborted) throw new ProxyError("aborted", "Stopped.");
    throw new ProxyError("network", "Connection interrupted.");
  } finally {
    reader.releaseLock();
  }

  return { text, truncated };
}
