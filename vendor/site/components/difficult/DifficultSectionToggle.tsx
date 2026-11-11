"use client";

import { Flag } from "lucide-react";
import { useDifficult } from "@site/hooks/useDifficult";
import { itemKey } from "@site/lib/difficult";
import { cn } from "@site/lib/cn";

interface DifficultSectionToggleProps {
  lectureSlug: string;
  sectionId: string;
}

export function DifficultSectionToggle({ lectureSlug, sectionId }: DifficultSectionToggleProps) {
  const { state, toggle } = useDifficult();
  const marked = Boolean(state.items[itemKey(lectureSlug, sectionId, null)]);

  return (
    <button
      type="button"
      onClick={() => toggle(lectureSlug, sectionId, null)}
      aria-pressed={marked}
      title={marked ? "Remove this section from your difficult parts" : "Add this whole section to your difficult parts"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
        marked
          ? "border-warning/40 bg-warning-soft text-warning"
          : "border-line bg-surface text-faint hover:border-warning/40 hover:text-warning",
      )}
    >
      <Flag size={13} className={cn(marked && "fill-current")} aria-hidden />
      {marked ? "Difficult" : "Mark difficult"}
    </button>
  );
}
