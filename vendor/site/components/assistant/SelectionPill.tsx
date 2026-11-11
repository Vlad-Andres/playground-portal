"use client";

import { Sparkles } from "lucide-react";
import type { SelectionAnchor } from "@site/hooks/useTextSelection";
import { cn } from "@site/lib/cn";

const PILL_WIDTH = 132;
const GAP = 10;

interface SelectionPillProps {
  anchor: SelectionAnchor;
  onAsk: () => void;
}

export function SelectionPill({ anchor, onAsk }: SelectionPillProps) {
  const dockedForTouch = window.matchMedia("(pointer: coarse)").matches;
  const fitsBelow = anchor.bottom + GAP + 40 < window.innerHeight;
  const top = fitsBelow ? anchor.bottom + GAP : Math.max(anchor.top - GAP - 36, 8);
  const left = Math.min(
    Math.max(anchor.centerX - PILL_WIDTH / 2, 8),
    window.innerWidth - PILL_WIDTH - 8,
  );

  return (
    <button
      type="button"
      data-assistant-ignore
      onPointerDown={(event) => event.preventDefault()}
      onClick={onAsk}
      aria-label="Ask AI about the selected text"
      style={
        dockedForTouch
          ? { bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)", left: "50%", transform: "translateX(-50%)" }
          : { top, left, width: PILL_WIDTH }
      }
      className={cn(
        "fixed z-40 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-medium text-brand-ink shadow-[var(--shadow-card)] transition-opacity hover:opacity-90",
        dockedForTouch ? "px-4 whitespace-nowrap" : "animate-rise",
      )}
    >
      <Sparkles size={15} aria-hidden />
      {dockedForTouch ? "Ask AI about selection" : "Ask AI"}
    </button>
  );
}
