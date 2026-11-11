"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { CategorizeProps } from "@core/widgets";
import { cn } from "@site/lib/cn";
import { seededShuffle } from "./shuffle";
import { buttonClass, correctClass, primaryButtonClass, promptClass, wrongClass } from "./ui";

/** Put each item into one of 2–4 groups, then check. */
export function Categorize({ prompt, categories, items }: CategorizeProps) {
  const order = useMemo(() => seededShuffle(items, items.map((item) => item.text).join("|")), [items]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const score = items.filter((item) => answers[item.text] === item.category).length;

  return (
    <div className="grid gap-3">
      {prompt ? <p className={promptClass}>{prompt}</p> : null}
      <ul className="grid gap-2">
        {order.map((item) => {
          const answer = answers[item.text];
          const right = answer === item.category;
          return (
            <li
              key={item.text}
              className={cn(
                "grid gap-2 rounded-xl border bg-surface px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                checked ? (right ? correctClass : wrongClass) : "border-line",
              )}
            >
              <span className="flex items-center gap-2 text-sm break-words text-ink">
                {checked ? (
                  right ? (
                    <Check size={15} className="shrink-0 text-positive" aria-label="Correct" />
                  ) : (
                    <X size={15} className="shrink-0 text-danger" aria-label={`Wrong — ${item.category}`} />
                  )
                ) : null}
                {item.text}
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Group for ${item.text}`}>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={answer === category}
                    onClick={() => {
                      setAnswers((current) => ({ ...current, [item.text]: category }));
                      setChecked(false);
                    }}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      answer === category
                        ? "border-brand bg-brand text-brand-ink"
                        : "border-line bg-surface text-muted hover:border-brand/50 hover:text-brand",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButtonClass} onClick={() => setChecked(true)}>
          <Check size={15} aria-hidden /> Check
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setAnswers({});
            setChecked(false);
          }}
        >
          <RotateCcw size={15} aria-hidden /> Reset
        </button>
        {checked ? (
          <p className="text-sm text-muted" aria-live="polite">
            {score} of {items.length} right
          </p>
        ) : null}
      </div>
    </div>
  );
}
