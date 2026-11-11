"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, List } from "lucide-react";
import type { LectureMeta } from "@site/content/types";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { useProgress } from "@site/hooks/useProgress";
import { lectureStats } from "@site/lib/progress";
import { cn } from "@site/lib/cn";

export function LectureToc({ meta, progressLabel }: { meta: LectureMeta; progressLabel?: string }) {
  const { progress } = useProgress();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(meta.outline[0]?.id ?? "");

  const stats = lectureStats(progress, meta);
  const completed = progress[meta.slug]?.sections ?? [];

  useEffect(() => {
    const sections = meta.outline
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [meta.outline]);

  return (
    <nav aria-label="Lecture sections" className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <List size={15} aria-hidden />
            Sections
          </p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-1 text-xs text-faint lg:hidden"
          >
            {stats.completedSections}/{stats.totalSections}
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
        <ProgressBar
          value={stats.ratio}
          label={progressLabel ?? `Lecture ${meta.number} progress`}
          tone={stats.completed ? "positive" : "brand"}
        />
      </div>

      <ol className={cn("grid grid-cols-[minmax(0,1fr)] gap-0.5", open ? "grid" : "hidden lg:grid")}>
        {meta.outline.map((section, index) => {
          const isDone = completed.includes(section.id);
          const isActive = section.id === activeId;

          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  isActive ? "bg-brand-soft font-medium text-brand-strong" : "text-muted hover:bg-sunken",
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border text-[9px] tabular-nums",
                    isDone ? "border-positive bg-positive text-surface" : "border-line-strong text-faint",
                  )}
                >
                  {isDone ? <Check size={10} strokeWidth={3} aria-hidden /> : index + 1}
                </span>
                <span className="truncate">{section.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
