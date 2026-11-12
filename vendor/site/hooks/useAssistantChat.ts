"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProxyError, streamProxyReply } from "@site/lib/assistant/proxy";
import { formatQuestion, type AssistantSelection } from "@site/lib/assistant/prompt";
import { useSite } from "@site/site/context";

export type TurnStatus = "thinking" | "streaming" | "done" | "truncated" | "stopped" | "error";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  selection?: AssistantSelection;
  status?: TurnStatus;
  error?: string;
  errorKind?: "auth" | "rate" | "busy" | "network" | "aborted" | "blocked" | "other";
  errorDetails?: string;
}

const conversations = new Map<string, ChatTurn[]>();

export function useAssistantChat(slug: string, context: string) {
  const { data } = useSite();
  const [turns, setTurns] = useState<ChatTurn[]>(() => conversations.get(slug) ?? []);
  const controller = useRef<AbortController | null>(null);
  const historyKey = useMemo(() => `${data.key}:${slug}`, [data.key, slug]);

  useEffect(() => {
    conversations.set(historyKey, turns);
  }, [historyKey, turns]);

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
      if (busy) return;

      const userTurn: ChatTurn = { id: crypto.randomUUID(), role: "user", text: question, selection };
      const assistantTurn: ChatTurn = { id: crypto.randomUUID(), role: "assistant", text: "", status: "thinking" };
      const history = [...turns, userTurn];
      setTurns([...history, assistantTurn]);

      const request = new AbortController();
      controller.current = request;

      try {
        const reply = await streamProxyReply(
          {
            question: formatQuestion(question, selection),
            context,
            courseTitle: data.course.title,
            selection,
            history: history
              .filter((turn) => turn.status !== "error")
              .map((turn) => ({ role: turn.role === "user" ? "user" : "model", text: turn.text })),
          },
          request.signal,
          (text) => updateTurn(assistantTurn.id, { text, status: "streaming" }),
        );
        updateTurn(assistantTurn.id, { text: reply.text, status: reply.truncated ? "truncated" : "done" });
      } catch (error) {
        if (error instanceof ProxyError && error.kind === "aborted") {
          updateTurn(assistantTurn.id, { status: "stopped" });
        } else {
          const failure = error instanceof ProxyError ? error : new ProxyError("other", "Something went wrong.");
          updateTurn(assistantTurn.id, {
            status: "error",
            error: failure.message,
            errorKind: failure.kind,
          });
        }
      } finally {
        if (controller.current === request) controller.current = null;
      }
    },
    [busy, context, data.course.title, turns, updateTurn],
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setTurns([]);
  }, []);

  return { turns, busy, send, stop, reset };
}
