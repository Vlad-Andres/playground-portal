"use client";

import { useState } from "react";
import { Check, Eye, RotateCcw } from "lucide-react";
import type { ClozePart } from "@site/components/difficult/kit";
import { cn } from "@site/lib/cn";

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Fill-in-the-blank on the key terms of the flagged part: active recall instead of rereading. */
export function ClozeDrill({ sentences }: { sentences: ClozePart[][] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);

  if (sentences.length === 0) {
    return <p className="text-sm text-muted">This part has no marked key terms to blank out — use the flashcards instead.</p>;
  }

  const blanks = sentences.flatMap((parts, sentenceIndex) =>
    parts.flatMap((part, partIndex) => (part.kind === "blank" ? [{ id: `${sentenceIndex}-${partIndex}`, answer: part.answer }] : [])),
  );
  const correct = blanks.filter((blank) => normalise(values[blank.id] ?? "") === normalise(blank.answer)).length;

  return (
    <div className="grid gap-4">
      <ol className="grid gap-3">
        {sentences.map((parts, sentenceIndex) => (
          <li key={sentenceIndex} className="text-sm leading-8 text-muted">
            {parts.map((part, partIndex) => {
              if (part.kind === "text") return <span key={partIndex}>{part.text} </span>;
              const id = `${sentenceIndex}-${partIndex}`;
              const right = normalise(values[id] ?? "") === normalise(part.answer);
              if (revealed.has(id)) {
                return (
                  <span key={partIndex} className="rounded-md bg-warning-soft px-1.5 py-0.5 font-semibold text-ink">
                    {part.answer}{" "}
                  </span>
                );
              }
              return (
                <span key={partIndex} className="inline-flex items-center gap-1 align-middle">
                  <input
                    value={values[id] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [id]: event.target.value }))}
                    aria-label="Missing term"
                    style={{ width: `${Math.max(6, Math.min(part.answer.length, 28)) + 2}ch` }}
                    className={cn(
                      "rounded-md border bg-surface px-1.5 py-0.5 text-sm text-ink outline-none focus:border-brand/60",
                      checked ? (right ? "border-positive bg-positive-soft" : "border-danger/60 bg-danger-soft") : "border-line-strong",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((current) => new Set(current).add(id))}
                    aria-label="Reveal this term"
                    className="text-faint hover:text-brand"
                  >
                    <Eye size={14} aria-hidden />
                  </button>{" "}
                </span>
              );
            })}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setChecked(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink hover:opacity-90"
        >
          <Check size={14} aria-hidden />
          Check
        </button>
        <button
          type="button"
          onClick={() => {
            setValues({});
            setRevealed(new Set());
            setChecked(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand/40"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
        {checked ? (
          <span className="text-sm font-medium text-ink">
            {correct} / {blanks.length} correct{correct === blanks.length ? " — perfect!" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
