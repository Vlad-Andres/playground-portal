"use client";

import type { ReactNode } from "react";
import { Flag } from "lucide-react";
import { useDifficult } from "@site/hooks/useDifficult";
import { blockAnchor, itemKey } from "@site/lib/difficult";
import { cn } from "@site/lib/cn";

interface DifficultBlockProps {
  lectureSlug: string;
  sectionId: string;
  blockIndex: number;
  children: ReactNode;
}

/** Wraps one content block with a flag that adds just this block to the difficult parts. */
export function DifficultBlock({ lectureSlug, sectionId, blockIndex, children }: DifficultBlockProps) {
  const { state, toggle } = useDifficult();
  const marked = Boolean(state.items[itemKey(lectureSlug, sectionId, blockIndex)]);

  return (
    <div
      id={blockAnchor(sectionId, blockIndex)}
      className={cn(
        "group/difficult relative scroll-mt-24 rounded-xl transition-colors",
        marked && "bg-warning-soft/30 ring-1 ring-warning/30 ring-offset-8 ring-offset-canvas",
      )}
    >
      <button
        type="button"
        onClick={() => toggle(lectureSlug, sectionId, blockIndex)}
        aria-pressed={marked}
        aria-label={marked ? "Remove this part from your difficult parts" : "Mark this part as difficult"}
        title={marked ? "Marked as difficult — click to remove" : "Mark this part as difficult"}
        className={cn(
          "absolute -top-3 right-0 z-10 grid size-7 place-items-center rounded-full border transition-opacity",
          "lg:top-0 lg:-left-10 lg:right-auto",
          marked
            ? "border-warning/50 bg-warning-soft text-warning opacity-100"
            : "border-line bg-surface text-faint opacity-0 hover:text-warning focus-visible:opacity-100 group-hover/difficult:opacity-100 [@media(hover:none)]:opacity-60",
        )}
      >
        <Flag size={13} className={cn(marked && "fill-current")} aria-hidden />
      </button>
      {children}
    </div>
  );
}
