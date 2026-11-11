"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { ClozeProps } from "@core/widgets";
import { cn } from "@site/lib/cn";
import { buttonClass, primaryButtonClass } from "./ui";

type Part = { text: string } | { gap: number; answer: string };

export function clozeParts(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  let gap = 0;
  for (const match of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ gap: gap++, answer: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** A sentence with drop-down gaps filled from all answers plus distractors. */
export function Cloze({ text, distractors = [] }: ClozeProps) {
  const parts = useMemo(() => clozeParts(text), [text]);
  const options = useMemo(() => {
    const answers = parts.flatMap((part) => ("gap" in part ? [part.answer] : []));
    return [...new Set([...answers, ...distractors])].sort((a, b) => a.localeCompare(b));
  }, [parts, distractors]);
  const gapCount = parts.filter((part) => "gap" in part).length;
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const score = parts.filter((part) => "gap" in part && chosen[part.gap] === part.answer).length;

  return (
    <div className="grid gap-3">
      <p className="text-base leading-9 text-ink">
        {parts.map((part, index) =>
          "gap" in part ? (
            <select
              key={index}
              aria-label={`Gap ${part.gap + 1}`}
              value={chosen[part.gap] ?? ""}
              onChange={(event) => {
                setChosen((current) => ({ ...current, [part.gap]: event.target.value }));
                setChecked(false);
              }}
              className={cn(
                "mx-1 max-w-full rounded-lg border bg-surface px-2 py-1 align-baseline text-sm text-ink",
                checked
                  ? chosen[part.gap] === part.answer
                    ? "border-positive bg-positive-soft"
                    : "border-danger bg-danger-soft"
                  : "border-line-strong",
              )}
            >
              <option value="">…</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <Fragment key={index}>{part.text}</Fragment>
          ),
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButtonClass} onClick={() => setChecked(true)}>
          <Check size={15} aria-hidden /> Check
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setChosen({});
            setChecked(false);
          }}
        >
          <RotateCcw size={15} aria-hidden /> Reset
        </button>
        {checked ? (
          <p className="text-sm text-muted" aria-live="polite">
            {score} of {gapCount} right
          </p>
        ) : null}
      </div>
    </div>
  );
}
