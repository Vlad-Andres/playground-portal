"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, RotateCcw, X } from "lucide-react";
import type { OrderItemsProps } from "@core/widgets";
import { Markdown } from "@site/components/content/Markdown";
import { cn } from "@site/lib/cn";
import { seededShuffle } from "./shuffle";
import { buttonClass, correctClass, iconButtonClass, primaryButtonClass, promptClass, wrongClass } from "./ui";

/** Put items in the right order with up/down buttons, then check each position. */
export function OrderItems({ prompt, items, explanation }: OrderItemsProps) {
  const start = useMemo(() => seededShuffle(items, prompt + items.join("|")), [items, prompt]);
  const [order, setOrder] = useState(start);
  const [checked, setChecked] = useState(false);
  const allRight = order.every((item, index) => item === items[index]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setChecked(false);
  }

  return (
    <div className="grid gap-3">
      <p className={promptClass}>{prompt}</p>
      <ol className="grid gap-2">
        {order.map((item, index) => {
          const right = item === items[index];
          return (
            <li
              key={item}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-surface px-3 py-2",
                checked ? (right ? correctClass : wrongClass) : "border-line",
              )}
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs text-faint tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1 text-sm break-words text-ink">{item}</span>
              {checked ? (
                right ? (
                  <Check size={16} className="shrink-0 text-positive" aria-label="Correct position" />
                ) : (
                  <X size={16} className="shrink-0 text-danger" aria-label="Wrong position" />
                )
              ) : null}
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move "${item}" up`}
              >
                <ArrowUp size={15} aria-hidden />
              </button>
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`Move "${item}" down`}
              >
                <ArrowDown size={15} aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButtonClass} onClick={() => setChecked(true)}>
          <Check size={15} aria-hidden /> Check
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setOrder(start);
            setChecked(false);
          }}
        >
          <RotateCcw size={15} aria-hidden /> Reset
        </button>
        {checked ? (
          <p className="text-sm text-muted" aria-live="polite">
            {allRight
              ? "All in the right order."
              : `${order.filter((item, index) => item === items[index]).length} of ${items.length} in place.`}
          </p>
        ) : null}
      </div>
      {checked && allRight && explanation ? (
        <div className="rounded-xl border border-positive/40 bg-positive-soft/60 px-4 py-3 text-sm">
          <Markdown>{explanation}</Markdown>
        </div>
      ) : null}
    </div>
  );
}
