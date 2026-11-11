"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import type { Flashcard } from "@site/components/difficult/kit";
import { Markdown } from "@site/components/content/Markdown";
import { cn } from "@site/lib/cn";

/** A deck of flip cards: answer in your head, flip, then mark whether you knew it. */
export function FlipCards({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  if (cards.length === 0) {
    return <p className="text-sm text-muted">No memory cards or glossary entries belong to this part — try the concept map.</p>;
  }

  const card = cards[index];
  const go = (next: number) => {
    setIndex((next + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between text-xs text-faint">
        <span>
          Card {index + 1} / {cards.length}
        </span>
        <span>
          Known {known.size} / {cards.length}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="[perspective:1000px]"
        aria-label={flipped ? "Show the question" : "Show the answer"}
      >
        <div
          className={cn(
            "relative grid min-h-40 transition-transform duration-500 [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <div className="col-start-1 row-start-1 grid place-items-center rounded-2xl border border-brand/30 bg-brand-soft/50 p-6 text-center [backface-visibility:hidden]">
            <span className="text-base font-semibold text-ink">{card.front}</span>
            <span className="mt-2 flex items-center gap-1 text-xs text-faint">
              <RotateCw size={12} aria-hidden /> Tap to flip
            </span>
          </div>
          <div className="col-start-1 row-start-1 grid place-items-center rounded-2xl border border-positive/30 bg-positive-soft p-6 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <Markdown className="text-sm">{card.back}</Markdown>
          </div>
        </div>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => go(index - 1)} className="rounded-lg border border-line p-1.5 text-muted hover:border-brand/40" aria-label="Previous card">
          <ChevronLeft size={16} aria-hidden />
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setKnown((current) => {
                const next = new Set(current);
                next.delete(index);
                return next;
              });
              go(index + 1);
            }}
            className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={() => {
              setKnown((current) => new Set(current).add(index));
              go(index + 1);
            }}
            className="rounded-lg border border-positive/40 bg-positive-soft px-3 py-1.5 text-sm font-medium text-positive"
          >
            I knew it
          </button>
        </div>
        <button type="button" onClick={() => go(index + 1)} className="rounded-lg border border-line p-1.5 text-muted hover:border-brand/40" aria-label="Next card">
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
