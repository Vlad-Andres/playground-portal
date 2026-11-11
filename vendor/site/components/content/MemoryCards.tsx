"use client";

import { useState } from "react";
import { Brain, Eye, EyeOff } from "lucide-react";
import type { RecallCard } from "@site/content/types";
import { Markdown } from "@site/components/content/Markdown";
import { cn } from "@site/lib/cn";

export function MemoryCards({ cards }: { cards: RecallCard[] }) {
  const [revealedIndexes, setRevealedIndexes] = useState<number[]>([]);

  const toggleCard = (index: number) =>
    setRevealedIndexes((previous) =>
      previous.includes(index) ? previous.filter((value) => value !== index) : [...previous, index],
    );

  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-sunken/60 p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Brain size={16} className="text-brand" aria-hidden />
          Memory cards
        </h3>
        <p className="text-xs text-faint">Answer in your head first, then flip the card.</p>
      </header>

      <ol className="grid gap-2.5 sm:grid-cols-2">
        {cards.map((card, index) => {
          const isRevealed = revealedIndexes.includes(index);
          return (
            <li
              key={card.prompt}
              className={cn(
                "grid content-start gap-2.5 rounded-xl border bg-surface px-3.5 py-3 transition-colors",
                isRevealed ? "border-brand/35" : "border-line",
              )}
            >
              <Markdown className="text-sm [&_p]:font-medium [&_p]:text-ink">{card.prompt}</Markdown>
              {isRevealed ? (
                <Markdown className="animate-rise border-t border-line pt-2.5 text-sm">{card.answer}</Markdown>
              ) : null}
              <button
                type="button"
                onClick={() => toggleCard(index)}
                aria-expanded={isRevealed}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-faint transition-colors hover:text-brand"
              >
                {isRevealed ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
                {isRevealed ? "Hide answer" : "Show answer"}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
