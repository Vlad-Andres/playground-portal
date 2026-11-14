import { GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";
import { buildSystem } from "@/lib/assistant/prompt";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-1.5-flash";

const selectionSchema = z.object({
  text: z.string(),
  sectionTitle: z.string().optional(),
  truncated: z.boolean().optional(),
});

const historyTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string(),
});

const requestSchema = z.object({
  question: z.string().min(1).max(4000),
  context: z.string().min(1).max(500_000),
  courseTitle: z.string().min(1).max(500),
  selection: selectionSchema.optional(),
  history: z.array(historyTurnSchema).max(50).optional(),
});

type ProxyErrorKind = "auth" | "rate" | "busy" | "network" | "aborted" | "blocked" | "other";

function errorJson(kind: ProxyErrorKind, error: string) {
  return JSON.stringify({ kind, error });
}

function toContents(history: { role: "user" | "model"; text: string }[], question: string): Content[] {
  return [
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: question }] },
  ];
}

function describeError(error: unknown): { kind: ProxyErrorKind; message: string } {
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "aborted", message: "Stopped." };
  }
  if (error instanceof Error && /fetch|network|timeout/i.test(error.message)) {
    return { kind: "network", message: "Could not reach the AI service. Try again." };
  }
  return { kind: "other", message: "Something went wrong." };
}

export async function POST(request: Request) {
  const apiKey = process.env.ASSISTANT_API_KEY;
  if (!apiKey) {
    return Response.json({ kind: "auth", error: "Ask AI is not configured on this server." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ kind: "other", error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ kind: "other", error: "Invalid request." }, { status: 400 });
  }

  const { question, context, courseTitle, history } = parsed.data;

  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  const genAI = new GoogleGenAI({ apiKey });

  let stream;
  try {
    stream = await genAI.models.generateContentStream({
      model: DEFAULT_MODEL,
      contents: toContents(history ?? [], question),
      config: {
        systemInstruction: buildSystem(courseTitle, context),
        maxOutputTokens: 16000,
        abortSignal: controller.signal,
      },
    });
  } catch (error) {
    const { kind, message } = describeError(error);
    return Response.json({ kind, error: message }, { status: kind === "auth" ? 401 : 503 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let text = "";
      let truncated = false;
      let finishReason: string | undefined;

      try {
        for await (const chunk of stream) {
          if (chunk.promptFeedback?.blockReason) {
            controller.enqueue(encoder.encode(`data: ${errorJson("blocked", "The AI declined to answer this question.")}\n\n`));
            controller.close();
            return;
          }
          finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
          if (chunk.text) {
            text += chunk.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text, truncated })}\n\n`));
          }
        }
        truncated = finishReason === "MAX_TOKENS";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text, truncated })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const { kind, message } = describeError(error);
        controller.enqueue(encoder.encode(`data: ${errorJson(kind, message)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
