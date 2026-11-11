import type { Content, HttpOptions } from "@google/genai";

export const ASSISTANT_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Newest and strongest, but often overloaded on the free tier." },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", note: "Slightly older, and usually available when 3.8 is busy." },
] as const;

export type AssistantModelId = (typeof ASSISTANT_MODELS)[number]["id"];

export const DEFAULT_ASSISTANT_MODEL: AssistantModelId = "gemini-3.8-flash";

export function assistantModelLabel(model: AssistantModelId) {
  return ASSISTANT_MODELS.find((candidate) => candidate.id === model)?.label ?? model;
}

export type AssistantErrorKind = "auth" | "rate" | "busy" | "network" | "aborted" | "blocked" | "other";

export class AssistantError extends Error {
  constructor(
    readonly kind: AssistantErrorKind,
    message: string,
    readonly diagnostics?: string,
  ) {
    super(message);
  }
}

async function loadSdk() {
  return import("@google/genai");
}

function googleMessage(raw: string) {
  try {
    const body = JSON.parse(raw.slice(raw.indexOf("{")));
    return { message: String(body?.error?.message ?? ""), details: JSON.stringify(body?.error?.details ?? []) };
  } catch {
    return { message: "", details: "" };
  }
}

function toAssistantError(
  sdk: Awaited<ReturnType<typeof loadSdk>>,
  model: AssistantModelId,
  error: unknown,
  signal?: AbortSignal,
): AssistantError {
  if (error instanceof AssistantError) return error;
  if (signal?.aborted) return new AssistantError("aborted", "Stopped.");
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new AssistantError("network", "The connection to Gemini was interrupted. Try again.");
  }
  if (error instanceof sdk.ApiError) {
    const { message, details } = googleMessage(error.message);
    if (details.includes("API_KEY_INVALID") || /api key not valid/i.test(message)) {
      return new AssistantError("auth", "Google rejected this API key. Reconnect with a valid key.");
    }
    if (error.status === 401 || error.status === 403) {
      return new AssistantError("auth", `This key cannot use ${assistantModelLabel(model)}. ${message}`.trim());
    }
    if (error.status === 429) {
      return new AssistantError(
        "rate",
        "You reached the free-tier limit for now. Wait a minute and try again — the daily allowance resets overnight (Pacific time).",
      );
    }
    if (error.status >= 500) {
      return new AssistantError(
        "busy",
        `${assistantModelLabel(model)} is overloaded at Google right now. Try again later, or switch to another model.`,
      );
    }
    return new AssistantError("other", message || `Google returned an error (${error.status}).`);
  }
  if (error instanceof TypeError) {
    return new AssistantError("network", "Could not reach Google's Gemini API. Check your connection.");
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new AssistantError("other", `Something went wrong while talking to Gemini: ${detail}`);
}

async function createClient(apiKey: string, httpOptions: HttpOptions) {
  const sdk = await loadSdk();
  return { sdk, client: new sdk.GoogleGenAI({ apiKey, httpOptions }) };
}

export async function verifyApiKey(apiKey: string) {
  const { sdk, client } = await createClient(apiKey, { timeout: 20_000 });
  try {
    await client.models.get({ model: DEFAULT_ASSISTANT_MODEL });
  } catch (error) {
    throw toAssistantError(sdk, DEFAULT_ASSISTANT_MODEL, error);
  }
}

export interface ReplyRequest {
  apiKey: string;
  model: AssistantModelId;
  system: string;
  contents: Content[];
  signal: AbortSignal;
  onText: (text: string) => void;
}

export interface Reply {
  text: string;
  truncated: boolean;
}

const BLOCKED_REASONS = new Set(["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"]);
const STREAM_TAIL_LENGTH = 2000;

interface StreamRecord {
  status?: number;
  bytes: number;
  tail: string;
}

function recordingFetch(record: StreamRecord): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init);
    record.status = response.status;
    if (!response.body) return response;
    const decoder = new TextDecoder();
    const recordedBody = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          record.bytes += chunk.byteLength;
          record.tail = (record.tail + decoder.decode(chunk, { stream: true })).slice(-STREAM_TAIL_LENGTH);
          controller.enqueue(chunk);
        },
      }),
    );
    return new Response(recordedBody, response);
  };
}

function googleErrorInStream(sdk: Awaited<ReturnType<typeof loadSdk>>, streamTail: string) {
  const lastEvent = streamTail.split(/\r\n\r\n|\n\n|\r\r/).pop() ?? "";
  const start = lastEvent.indexOf("{");
  const end = lastEvent.lastIndexOf("}");
  if (start < 0 || end < start) return undefined;
  try {
    const body = JSON.parse(lastEvent.slice(start, end + 1));
    const status = Number(body?.error?.code);
    return status >= 400 ? new sdk.ApiError({ message: JSON.stringify(body), status }) : undefined;
  } catch {
    return undefined;
  }
}

interface FailureContext {
  model: AssistantModelId;
  error: unknown;
  record: StreamRecord;
  startedAt: number;
  answerLength: number;
  finishReason?: string;
}

function describeFailure({ model, error, record, startedAt, answerLength, finishReason }: FailureContext) {
  return [
    `model: ${model}`,
    `started: ${new Date(startedAt).toISOString()}`,
    `elapsed: ${((Date.now() - startedAt) / 1000).toFixed(1)} s`,
    `http status: ${record.status ?? "no response"}`,
    `received: ${record.bytes} bytes, ${answerLength} characters of answer`,
    `finish reason: ${finishReason ?? "none"}`,
    `error: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
    `stream tail: ${JSON.stringify(record.tail.slice(-600))}`,
  ].join("\n");
}

export async function streamReply(request: ReplyRequest): Promise<Reply> {
  const record: StreamRecord = { bytes: 0, tail: "" };
  const startedAt = Date.now();
  const { sdk, client } = await createClient(request.apiKey, { fetch: recordingFetch(record) });
  let text = "";
  let finishReason: string | undefined;

  try {
    const stream = await client.models.generateContentStream({
      model: request.model,
      contents: request.contents,
      config: {
        systemInstruction: request.system,
        thinkingConfig: { thinkingLevel: sdk.ThinkingLevel.LOW },
        maxOutputTokens: 16000,
        abortSignal: request.signal,
      },
    });

    for await (const chunk of stream) {
      if (chunk.promptFeedback?.blockReason) finishReason = "BLOCKLIST";
      finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
      if (chunk.text) {
        text += chunk.text;
        request.onText(text);
      }
    }
    if (!finishReason) {
      throw new AssistantError("network", "Gemini's answer was cut off before it finished. Try again.");
    }
  } catch (error) {
    const failure = toAssistantError(sdk, request.model, googleErrorInStream(sdk, record.tail) ?? error, request.signal);
    if (failure.kind === "aborted") throw failure;
    const diagnostics = describeFailure({
      model: request.model,
      error,
      record,
      startedAt,
      answerLength: text.length,
      finishReason,
    });
    throw new AssistantError(failure.kind, failure.message, diagnostics);
  }

  if (!text && finishReason && BLOCKED_REASONS.has(finishReason)) {
    throw new AssistantError("blocked", "Gemini declined to answer this one. Try rephrasing the question.");
  }
  return { text, truncated: finishReason === "MAX_TOKENS" };
}
