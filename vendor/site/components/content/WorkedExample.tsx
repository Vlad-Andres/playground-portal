"use client";

import { useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";
import type { WorkedStep } from "@site/content/types";
import { Markdown } from "@site/components/content/Markdown";
import { Card } from "@site/components/ui/Card";
import { cn } from "@site/lib/cn";

interface WorkedExampleProps {
  title: string;
  intro?: string;
  steps: WorkedStep[];
}

export function WorkedExample({ title, intro, steps }: WorkedExampleProps) {
  const [revealed, setRevealed] = useState(1);
  const allRevealed = revealed >= steps.length;

  return (
    <Card className="grid gap-4 p-5 sm:p-6">
      <div className="grid gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
          <ListChecks size={18} className="text-brand" aria-hidden />
          {title}
        </h3>
        {intro ? <Markdown className="text-sm">{intro}</Markdown> : null}
      </div>

      <ol className="grid gap-3">
        {steps.slice(0, revealed).map((step, index) => (
          <li key={step.title} className="animate-rise grid grid-cols-[auto_1fr] gap-3">
            <span className="mt-0.5 grid size-6 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
              {index + 1}
            </span>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">{step.title}</p>
              <Markdown className="text-sm">{step.md}</Markdown>
            </div>
          </li>
        ))}
      </ol>

      {!allRevealed ? (
        <button
          type="button"
          onClick={() => setRevealed((value) => Math.min(value + 1, steps.length))}
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-lg border border-line bg-sunken px-3 py-1.5",
            "text-sm font-medium text-ink transition-colors hover:border-brand/40 hover:bg-brand-soft",
          )}
        >
          Reveal step {revealed + 1} of {steps.length}
          <ChevronDown size={15} aria-hidden />
        </button>
      ) : (
        <p className="text-xs text-faint">All {steps.length} steps shown.</p>
      )}
    </Card>
  );
}
