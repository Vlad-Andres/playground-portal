"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { StudyText } from "@site/components/content/Markdown";
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
  const mathOptions = options.some((option) => /\$[^$]+\$/.test(option));
  const gapCount = parts.filter((part) => "gap" in part).length;
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const score = parts.filter((part) => "gap" in part && chosen[part.gap] === part.answer).length;

  return (
    <div className="grid gap-3">
      <p className="text-base leading-9 text-ink">
        {parts.map((part, index) =>
          "gap" in part ? mathOptions ? (
            <span key={index} role="group" aria-label={`Gap ${part.gap + 1}`} className="mx-1 inline-flex flex-wrap gap-1 align-middle">
              {options.map((option) => {
                const selected = chosen[part.gap] === option;
                return (
                  <button key={option} type="button" aria-pressed={selected}
                    className={cn(buttonClass, selected && (checked ? (option === part.answer ? "bg-positive-soft text-positive" : "bg-danger-soft text-danger") : "bg-brand-soft text-ink"))}
                    onClick={() => {
                      setChosen((current) => ({ ...current, [part.gap]: option }));
                      setChecked(false);
                    }}
                  >
                    <StudyText>{option}</StudyText>
                  </button>
                );
              })}
            </span>
          ) : (
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
            <Fragment key={index}><StudyText>{part.text}</StudyText></Fragment>
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
