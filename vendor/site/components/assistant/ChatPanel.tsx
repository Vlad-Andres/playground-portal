"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Quote, RotateCcw, Square, X } from "lucide-react";
import { Markdown } from "@site/components/content/Markdown";
import type { ChatTurn } from "@site/hooks/useAssistantChat";
import type { AssistantSelection } from "@site/lib/assistant/prompt";

const SUGGESTIONS = ["Explain this simply", "Walk me through an example", "Why does this matter?"];

interface ChatPanelProps {
  courseLabel: string;
  turns: ChatTurn[];
  busy: boolean;
  pending?: AssistantSelection;
  onClearPending: () => void;
  onSend: (question: string) => void;
  onStop: () => void;
  onReset: () => void;
  onClose: () => void;
}

function SelectionQuote({ selection }: { selection: AssistantSelection }) {
  return (
    <p className="line-clamp-3 border-l-2 border-brand/40 pl-2.5 text-xs text-muted">
      {selection.sectionTitle ? <span className="font-medium text-ink">{selection.sectionTitle}: </span> : null}
      “{selection.text}”
    </p>
  );
}

function AssistantTurn({ turn }: { turn: ChatTurn }) {
  const waiting = turn.status === "thinking" && turn.text.length === 0;

  return (
    <div className="grid gap-2">
      {waiting ? (
        <p className="flex items-center gap-2 text-sm text-faint">
          <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
          Thinking…
        </p>
      ) : null}
      {turn.text ? <Markdown className="text-sm [&_p]:text-ink">{turn.text}</Markdown> : null}
      {turn.status === "truncated" ? (
        <p className="text-xs text-warning">The answer reached the length limit and was cut off.</p>
      ) : null}
      {turn.status === "stopped" ? <p className="text-xs text-faint">Stopped.</p> : null}
      {turn.status === "error" ? (
        <p className="rounded-xl border border-danger/35 bg-danger-soft/60 px-3 py-2 text-sm text-danger">{turn.error}</p>
      ) : null}
    </div>
  );
}

export function ChatPanel({
  courseLabel,
  turns,
  busy,
  pending,
  onClearPending,
  onSend,
  onStop,
  onReset,
  onClose,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"]')) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setDraft("");
  };

  return (
    <div
      role="dialog"
      aria-label="Ask AI about this course"
      data-assistant-ignore
      className="animate-rise fixed inset-x-2 bottom-2 z-40 flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:h-[36rem] sm:max-h-[calc(100vh-6rem)] sm:w-[26rem]"
    >
      <header className="flex items-center gap-2 border-b border-line bg-brand-soft/40 px-4 py-3">
        <div className="grid min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Ask AI</p>
          <p className="truncate text-xs text-faint">{courseLabel}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={turns.length === 0}
          aria-label="Start a new conversation"
          title="New conversation"
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
        >
          <RotateCcw size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      <div ref={listRef} aria-busy={busy} className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
        {turns.length === 0 ? (
          <div className="grid gap-2 text-sm text-muted">
            <p>Ask anything about this course. Answers draw on the lectures, examples, quizzes and exercises.</p>
            <p className="text-xs text-faint">Tip: select any text on the page to ask about that passage.</p>
          </div>
        ) : (
          turns.map((turn) =>
            turn.role === "user" ? (
              <div key={turn.id} className="grid justify-items-end gap-1.5">
                {turn.selection ? (
                  <div className="max-w-[90%]">
                    <SelectionQuote selection={turn.selection} />
                  </div>
                ) : null}
                <p className="max-w-[90%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-sm whitespace-pre-wrap text-brand-ink">
                  {turn.text}
                </p>
              </div>
            ) : (
              <AssistantTurn key={turn.id} turn={turn} />
            ),
          )
        )}
      </div>

      <div className="grid gap-2 border-t border-line p-3">
        {pending ? (
          <div className="grid gap-2 rounded-xl border border-brand/25 bg-brand-soft/40 px-3 py-2">
            <div className="flex items-start gap-2">
              <Quote size={13} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 flex-1">
                <SelectionQuote selection={pending} />
              </div>
              <button
                type="button"
                onClick={onClearPending}
                aria-label="Remove the selected passage"
                className="grid size-6 shrink-0 place-items-center rounded-md text-faint hover:bg-sunken hover:text-ink"
              >
                <X size={13} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={busy}
                  onClick={() => submit(suggestion)}
                  className="rounded-full border border-brand/30 bg-surface px-2.5 py-1 text-xs font-medium text-brand-strong transition-colors hover:bg-brand-soft disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            placeholder={pending ? "Ask about the selected passage…" : "Ask about this course…"}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors [field-sizing:content] focus:border-brand/60 placeholder:text-faint"
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop the answer"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink transition-colors hover:bg-sunken"
            >
              <Square size={14} fill="currentColor" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <ArrowUp size={17} aria-hidden />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
