"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Content } from "@google/genai";
import { AssistantError, streamReply, type AssistantErrorKind, type AssistantModelId } from "@site/lib/assistant/gemini";
import { readApiKey } from "@site/lib/assistant/credentials";
import { readAssistantModel } from "@site/lib/assistant/modelPreference";
import { buildSystem, formatQuestion, type AssistantSelection } from "@site/lib/assistant/prompt";
import { useSite } from "@site/site/context";

export type TurnStatus = "thinking" | "streaming" | "done" | "truncated" | "stopped" | "error";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  selection?: AssistantSelection;
  status?: TurnStatus;
  model?: AssistantModelId;
  error?: string;
  errorKind?: AssistantErrorKind;
  errorDetails?: string;
}

const conversations = new Map<string, ChatTurn[]>();

function toContents(turns: ChatTurn[]): Content[] {
  return turns.flatMap<Content>((turn) => {
    if (turn.role === "user") {
      return [{ role: "user", parts: [{ text: formatQuestion(turn.text, turn.selection) }] }];
    }
    const text = turn.text.trim();
    return text && turn.status !== "error" ? [{ role: "model", parts: [{ text }] }] : [];
  });
}

export function useAssistantChat(slug: string, lectureContext: string) {
  const { data, storageKey } = useSite();
  const apiKeyStorageKey = storageKey("gemini-api-key");
  const modelStorageKey = storageKey("gemini-model");
  const [turns, setTurns] = useState<ChatTurn[]>(() => conversations.get(slug) ?? []);
  const controller = useRef<AbortController | null>(null);
  const system = useMemo(
    () => buildSystem(data.course.title, lectureContext),
    [data.course.title, lectureContext],
  );

  useEffect(() => {
    conversations.set(slug, turns);
  }, [slug, turns]);

  useEffect(() => {
    const active = controller;
    return () => active.current?.abort();
  }, []);

  const busy = turns.some((turn) => turn.status === "thinking" || turn.status === "streaming");

  const updateTurn = useCallback((id: string, patch: Partial<ChatTurn>) => {
    setTurns((previous) => previous.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }, []);

  const send = useCallback(
    async (question: string, selection?: AssistantSelection) => {
      const apiKey = readApiKey(apiKeyStorageKey);
      if (!apiKey || busy) return;

      const model = readAssistantModel(modelStorageKey);
      const userTurn: ChatTurn = { id: crypto.randomUUID(), role: "user", text: question, selection };
      const assistantTurn: ChatTurn = { id: crypto.randomUUID(), role: "assistant", text: "", status: "thinking", model };
      const history = [...turns, userTurn];
      setTurns([...history, assistantTurn]);

      const request = new AbortController();
      controller.current = request;

      try {
        const reply = await streamReply({
          apiKey,
          model,
          system,
          contents: toContents(history),
          signal: request.signal,
          onText: (text) => updateTurn(assistantTurn.id, { text, status: "streaming" }),
        });
        updateTurn(assistantTurn.id, { text: reply.text, status: reply.truncated ? "truncated" : "done" });
      } catch (error) {
        const failure =
          error instanceof AssistantError ? error : new AssistantError("other", "Something went wrong.");
        updateTurn(
          assistantTurn.id,
          failure.kind === "aborted"
            ? { status: "stopped" }
            : { status: "error", error: failure.message, errorKind: failure.kind, errorDetails: failure.diagnostics },
        );
      } finally {
        if (controller.current === request) controller.current = null;
      }
    },
    [apiKeyStorageKey, busy, modelStorageKey, turns, system, updateTurn],
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setTurns([]);
  }, []);

  return { turns, busy, send, stop, reset };
}
