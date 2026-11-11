"use client";

import { Check, Circle } from "lucide-react";
import { useProgress } from "@site/hooks/useProgress";
import { cn } from "@site/lib/cn";

interface SectionCompleteToggleProps {
  lectureSlug: string;
  sectionId: string;
}

export function SectionCompleteToggle({ lectureSlug, sectionId }: SectionCompleteToggleProps) {
  const { progress, toggleSection } = useProgress();
  const isDone = progress[lectureSlug]?.sections.includes(sectionId) ?? false;

  return (
    <button
      type="button"
      onClick={() => toggleSection(lectureSlug, sectionId)}
      aria-pressed={isDone}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        isDone
          ? "border-positive/40 bg-positive-soft text-positive"
          : "border-line bg-surface text-muted hover:border-brand/40 hover:text-brand",
      )}
    >
      {isDone ? <Check size={15} aria-hidden /> : <Circle size={15} aria-hidden />}
      {isDone ? "Marked as read" : "Mark as read"}
    </button>
  );
}
