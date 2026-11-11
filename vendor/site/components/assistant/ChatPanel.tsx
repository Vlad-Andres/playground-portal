"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, Quote, RotateCcw, Settings2, Sparkles, Square, X } from "lucide-react";
import { Markdown } from "@site/components/content/Markdown";
import { ConnectForm } from "@site/components/assistant/ConnectForm";
import type { ChatTurn } from "@site/hooks/useAssistantChat";
import { useAssistantModel } from "@site/hooks/useAssistantModel";
import { ASSISTANT_MODELS, assistantModelLabel, type AssistantModelId } from "@site/lib/assistant/gemini";
import { clearApiKey, type KeyStatus } from "@site/lib/assistant/credentials";
import { storeAssistantModel } from "@site/lib/assistant/modelPreference";
import type { AssistantSelection } from "@site/lib/assistant/prompt";
import { cn } from "@site/lib/cn";
import { useSite } from "@site/site/context";

const SUGGESTIONS = ["Explain this simply", "Walk me through an example", "Why does this matter?"];

interface ChatPanelProps {
  lectureLabel: string;
  turns: ChatTurn[];
  busy: boolean;
  pending?: AssistantSelection;
  keyStatus: KeyStatus;
  onClearPending: () => void;
  onSend: (question: string) => void;
  onStop: () => void;
  onReset: () => void;
  onClose: () => void;
}

function SelectionQuote({ selection }: { selection: AssistantSelection }) {
  return (
    <p className="line-clamp-3 border-l-2 border-brand/40 pl-2.5 text-xs text-muted">
      {selection.sectionTitle ? (
        <span className="font-medium text-ink">{selection.sectionTitle}: </span>
      ) : null}
      “{selection.text}”
    </p>
  );
}

function ErrorDetails({ details }: { details: string }) {
  const [copied, setCopied] = useState(false);

  async function copyDetails() {
    await navigator.clipboard.writeText(details);
    setCopied(true);
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-faint transition-colors hover:text-brand">Technical details</summary>
      <div className="mt-1.5 grid gap-1.5 rounded-xl border border-line bg-sunken px-3 py-2">
        <pre className="font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-muted">{details}</pre>
        <button
          type="button"
          onClick={copyDetails}
          className="inline-flex items-center gap-1.5 justify-self-start font-medium text-muted transition-colors hover:text-brand"
        >
          {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
          {copied ? "Copied" : "Copy details"}
        </button>
      </div>
    </details>
  );
}

function ModelPicker() {
  const { storageKey } = useSite();
  const selectedModel = useAssistantModel();

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium text-ink">Model</legend>
      {ASSISTANT_MODELS.map((model) => (
        <label
          key={model.id}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
            selectedModel === model.id ? "border-brand/50 bg-brand-soft/50" : "border-line bg-surface hover:border-brand/40",
          )}
        >
          <input
            type="radio"
            name="assistant-model"
            value={model.id}
            checked={selectedModel === model.id}
            onChange={() => storeAssistantModel(storageKey("gemini-model"), model.id)}
            className="mt-1 accent-brand"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium text-ink">{model.label}</span>
            <span className="text-xs text-faint">{model.note}</span>
          </span>
        </label>
      ))}
      <p className="text-xs text-faint">Both run at their lowest thinking level, which keeps answers quick.</p>
    </fieldset>
  );
}

function SwitchModelButton({ failedModel }: { failedModel: AssistantModelId }) {
  const { storageKey } = useSite();
  const selectedModel = useAssistantModel();
  const alternative = ASSISTANT_MODELS.find((model) => model.id !== failedModel);
  if (!alternative) return null;
  if (selectedModel !== failedModel) {
    return <span className="ml-2 font-medium">Switched to {assistantModelLabel(selectedModel)} — ask again.</span>;
  }

  return (
    <button
      type="button"
      onClick={() => storeAssistantModel(storageKey("gemini-model"), alternative.id)}
      className="ml-2 font-medium underline underline-offset-2"
    >
      Switch to {assistantModelLabel(alternative.id)}
    </button>
  );
}

function AssistantTurn({ turn }: { turn: ChatTurn }) {
  const { storageKey } = useSite();
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
        <p className="rounded-xl border border-danger/35 bg-danger-soft/60 px-3 py-2 text-sm text-danger">
          {turn.error}
          {turn.errorKind === "auth" ? (
            <button
              type="button"
              onClick={() => clearApiKey(storageKey("gemini-api-key"))}
              className="ml-2 font-medium underline underline-offset-2"
            >
              Reconnect
            </button>
          ) : null}
          {turn.errorKind === "busy" && turn.model ? <SwitchModelButton failedModel={turn.model} /> : null}
        </p>
      ) : null}
      {turn.status === "error" && turn.errorDetails ? <ErrorDetails details={turn.errorDetails} /> : null}
    </div>
  );
}

export function ChatPanel({
  lectureLabel,
  turns,
  busy,
  pending,
  keyStatus,
  onClearPending,
  onSend,
  onStop,
  onReset,
  onClose,
}: ChatPanelProps) {
  const { storageKey } = useSite();
  const [view, setView] = useState<"chat" | "settings">("chat");
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const connected = keyStatus !== "none";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (connected && view === "chat") inputRef.current?.focus();
  }, [connected, view, pending]);

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
      aria-label="Ask AI about this lecture"
      data-assistant-ignore
      className="animate-rise fixed inset-x-2 bottom-2 z-40 flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:h-[36rem] sm:max-h-[calc(100vh-6rem)] sm:w-[26rem]"
    >
      <header className="flex items-center gap-2 border-b border-line bg-brand-soft/40 px-4 py-3">
        <Sparkles size={16} className="shrink-0 text-brand" aria-hidden />
        <div className="grid min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Ask AI</p>
          <p className="truncate text-xs text-faint">{lectureLabel}</p>
        </div>
        {connected ? (
          <>
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
              onClick={() => setView(view === "chat" ? "settings" : "chat")}
              aria-pressed={view === "settings"}
              aria-label="Assistant settings"
              title="Settings"
              className={cn(
                "grid size-8 place-items-center rounded-lg transition-colors hover:bg-sunken hover:text-ink",
                view === "settings" ? "bg-sunken text-ink" : "text-muted",
              )}
            >
              <Settings2 size={15} aria-hidden />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      {!connected ? (
        <ConnectForm />
      ) : view === "settings" ? (
        <div className="grid content-start gap-4 overflow-y-auto p-4">
          <ModelPicker />

          <div className="grid gap-2 rounded-xl border border-line bg-sunken px-3 py-2.5">
            <p className="text-sm text-muted">
              {keyStatus === "device"
                ? "Your API key is remembered on this device."
                : "Your API key is kept for this browser tab only."}
            </p>
            <button
              type="button"
              onClick={() => clearApiKey(storageKey("gemini-api-key"))}
              className="w-fit text-sm font-medium text-danger underline underline-offset-2"
            >
              Disconnect and forget the key
            </button>
          </div>

          <p className="text-xs text-faint">
            Every question sends the lecture&apos;s full text as context. On Google&apos;s free tier
            that costs nothing, but questions count against its per-minute and daily limits.
          </p>
        </div>
      ) : (
        <>
          <div ref={listRef} aria-busy={busy} className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
            {turns.length === 0 ? (
              <div className="grid gap-2 text-sm text-muted">
                <p>Ask anything about this lecture. Answers draw on its sections, examples, quiz and exercises.</p>
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
                placeholder={pending ? "Ask about the selected passage…" : "Ask about this lecture…"}
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
        </>
      )}
    </div>
  );
}
