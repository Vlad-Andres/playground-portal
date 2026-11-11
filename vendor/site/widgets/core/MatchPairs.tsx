"use client";

import { useEffect, useMemo, useState } from "react";
import { PartyPopper, RotateCcw } from "lucide-react";
import type { MatchPairsProps } from "@core/widgets";
import { cn } from "@site/lib/cn";
import { seededShuffle } from "./shuffle";
import { buttonClass, promptClass } from "./ui";

/** Pick a left item, then the right item that belongs to it. */
export function MatchPairs({ prompt, pairs }: MatchPairsProps) {
  const lefts = useMemo(() => pairs.map((pair) => pair.left), [pairs]);
  const rights = useMemo(() => seededShuffle(pairs.map((pair) => pair.right), lefts.join("|")), [pairs, lefts]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const done = matched.size === pairs.length;

  useEffect(() => {
    if (!wrong) return;
    const timer = window.setTimeout(() => setWrong(null), 450);
    return () => window.clearTimeout(timer);
  }, [wrong]);

  function pickRight(right: string) {
    if (!selected) return;
    const pair = pairs.find((item) => item.left === selected);
    if (pair?.right === right) {
      setMatched((current) => new Set(current).add(selected));
      setSelected(null);
    } else {
      setWrong({ left: selected, right });
    }
  }

  const rightMatched = (right: string) => pairs.some((pair) => pair.right === right && matched.has(pair.left));
  const tile =
    "min-h-11 w-full rounded-xl border px-3 py-2 text-left text-sm break-words transition-colors disabled:cursor-default";

  return (
    <div className="grid gap-3">
      {prompt ? <p className={promptClass}>{prompt}</p> : null}
      <p className="text-xs text-faint">Pick an item on the left, then its partner on the right.</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="grid content-start gap-2">
          {lefts.map((left) => (
            <button
              key={left}
              type="button"
              disabled={matched.has(left)}
              aria-pressed={selected === left}
              onClick={() => setSelected(selected === left ? null : left)}
              className={cn(
                tile,
                matched.has(left)
                  ? "border-positive/40 bg-positive-soft text-muted"
                  : selected === left
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line bg-surface text-ink hover:border-brand/50",
                wrong?.left === left && "animate-shake border-danger/60",
              )}
            >
              {left}
            </button>
          ))}
        </div>
        <div className="grid content-start gap-2">
          {rights.map((right) => (
            <button
              key={right}
              type="button"
              disabled={rightMatched(right) || !selected}
              onClick={() => pickRight(right)}
              className={cn(
                tile,
                rightMatched(right)
                  ? "border-positive/40 bg-positive-soft text-muted"
                  : "border-line bg-surface text-ink enabled:hover:border-brand/50",
                wrong?.right === right && "animate-shake border-danger/60 bg-danger-soft",
              )}
            >
              {right}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        {done ? (
          <p className="flex items-center gap-2 rounded-lg bg-positive-soft px-3 py-1.5 text-sm font-medium text-positive">
            <PartyPopper size={15} aria-hidden /> All {pairs.length} pairs matched.
          </p>
        ) : (
          <p className="text-sm text-muted">
            {matched.size} of {pairs.length} matched
          </p>
        )}
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setMatched(new Set());
            setSelected(null);
          }}
        >
          <RotateCcw size={15} aria-hidden /> Reset
        </button>
      </div>
    </div>
  );
}
