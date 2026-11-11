"use client";

import { useRef } from "react";
import { Check, Eye, Lightbulb, X } from "lucide-react";
import type { ExerciseTask } from "@site/content/types";
import { Markdown } from "@site/components/content/Markdown";
import { useExerciseState } from "@site/hooks/useExerciseState";
import { emptyTaskState, gradeTask, taskKey, type SelfMark } from "@site/lib/exercises";
import { cn } from "@site/lib/cn";

const ALGEBRA_SYMBOLS = [
  { symbol: "Π", label: "projection" },
  { symbol: "σ", label: "selection" },
  { symbol: "ρ", label: "rename" },
  { symbol: "⋈", label: "join" },
  { symbol: "⋉", label: "left semi-join" },
  { symbol: "⋊", label: "right semi-join" },
  { symbol: "∪", label: "union" },
  { symbol: "∩", label: "intersection" },
  { symbol: "−", label: "difference" },
  { symbol: "×", label: "cross product" },
  { symbol: "∧", label: "and" },
  { symbol: "∨", label: "or" },
  { symbol: "¬", label: "not" },
  { symbol: "≠", label: "not equal" },
  { symbol: "≤", label: "less or equal" },
  { symbol: "≥", label: "greater or equal" },
  { symbol: "⊆", label: "subset of" },
  { symbol: "κ", label: "key candidate" },
];

const SELF_MARKS: { id: SelfMark; label: string; tone: string }[] = [
  { id: "correct", label: "Got it", tone: "border-positive/40 bg-positive-soft text-positive" },
  { id: "partial", label: "Partly", tone: "border-warning/40 bg-warning-soft text-warning" },
  { id: "wrong", label: "Missed it", tone: "border-danger/40 bg-danger-soft text-danger" },
];

interface ExerciseAnswerProps {
  sheetId: string;
  task: ExerciseTask;
  index: number;
}

export function ExerciseAnswer({ sheetId, task, index }: ExerciseAnswerProps) {
  const { state, setValue, toggleOption, reveal, setSelfMark, update } = useExerciseState();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const key = taskKey(sheetId, task.id);
  const taskState = state[key] ?? emptyTaskState;
  const verdict = gradeTask(task.check, taskState);
  const showVerdict = taskState.checked && (verdict === "correct" || verdict === "incorrect");

  const insertSymbol = (symbol: string) => {
    const field = textareaRef.current;
    if (!field) return;

    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    setValue(key, `${field.value.slice(0, start)}${symbol}${field.value.slice(end)}`);

    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };

  return (
    <li className="grid gap-3 border-t border-line pt-4 first:border-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-muted">
          {String.fromCharCode(97 + index)}
        </span>
        <Markdown className="text-sm">{task.prompt}</Markdown>
      </div>

      <div className="grid gap-2 pl-[2.1rem]">
        {task.check.mode === "select" ? (
          <div className="flex flex-wrap gap-1.5">
            {task.check.options.map((option) => {
              const isSelected = taskState.selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    toggleOption(key, option);
                    update(key, { checked: false });
                  }}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors",
                    isSelected
                      ? "border-brand/50 bg-brand-soft text-brand-strong"
                      : "border-line bg-surface text-muted hover:border-brand/40",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : task.check.mode === "text" ? (
          <input
            type="text"
            value={taskState.value}
            placeholder={task.check.placeholder ?? "Your answer"}
            onChange={(event) => {
              setValue(key, event.target.value);
              update(key, { checked: false });
            }}
            className="w-full max-w-sm rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-brand/60 placeholder:text-faint"
          />
        ) : (
          <div className="grid gap-1.5">
            {task.check.palette === "algebra" ? (
              <div className="flex flex-wrap gap-1">
                {ALGEBRA_SYMBOLS.map(({ symbol, label }) => (
                  <button
                    key={symbol}
                    type="button"
                    title={label}
                    aria-label={`Insert ${label}`}
                    onClick={() => insertSymbol(symbol)}
                    className="grid size-7 place-items-center rounded-md border border-line bg-sunken text-sm text-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              value={taskState.value}
              rows={4}
              placeholder="Write your answer here — it is saved in this browser."
              onChange={(event) => setValue(key, event.target.value)}
              className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand/60 placeholder:text-faint"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {task.check.mode !== "open" ? (
            <button
              type="button"
              onClick={() => update(key, { checked: true })}
              disabled={verdict === "unanswered"}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Check answer
            </button>
          ) : null}

          {task.hint ? (
            <details className="text-xs">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand">
                <Lightbulb size={13} aria-hidden />
                Hint
              </summary>
              <div className="mt-2 rounded-xl border border-line bg-sunken px-3 py-2">
                <Markdown className="text-sm">{task.hint}</Markdown>
              </div>
            </details>
          ) : null}

          {!taskState.revealed ? (
            <button
              type="button"
              onClick={() => reveal(key)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Eye size={14} aria-hidden />
              Show solution
            </button>
          ) : null}

          {showVerdict ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                verdict === "correct"
                  ? "border-positive/40 bg-positive-soft text-positive"
                  : "border-danger/40 bg-danger-soft text-danger",
              )}
            >
              {verdict === "correct" ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
              {verdict === "correct" ? "Correct" : "Not yet"}
            </span>
          ) : null}
        </div>

        {taskState.revealed ? (
          <div className="animate-rise grid gap-3 rounded-xl border border-positive/25 bg-positive-soft/40 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-positive uppercase">Solution</p>
            <Markdown className="text-sm">{task.solution}</Markdown>

            {task.check.mode === "open" ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-positive/20 pt-2.5">
                <span className="text-xs text-muted">How did you do?</span>
                {SELF_MARKS.map((mark) => (
                  <button
                    key={mark.id}
                    type="button"
                    onClick={() => setSelfMark(key, mark.id)}
                    aria-pressed={taskState.selfMark === mark.id}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      taskState.selfMark === mark.id
                        ? mark.tone
                        : "border-line bg-surface text-muted hover:border-brand/40",
                    )}
                  >
                    {mark.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
