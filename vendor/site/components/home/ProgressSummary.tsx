"use client";

import { Award, Flame, RotateCcw, Trophy } from "lucide-react";
import type { LectureMeta } from "@site/content/types";
import { Card } from "@site/components/ui/Card";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { useProgress } from "@site/hooks/useProgress";
import { courseStats } from "@site/lib/progress";
import { formatPercent } from "@site/lib/format";

interface ProgressSummaryProps {
  metas: LectureMeta[];
}

export function ProgressSummary({ metas }: ProgressSummaryProps) {
  const { progress, resetLecture } = useProgress();
  const stats = courseStats(progress, metas);

  const badges = [
    {
      id: "started",
      icon: Flame,
      label: "First steps",
      hint: "Open your first lecture",
      earned: stats.lecturesStarted > 0,
    },
    {
      id: "quiz",
      icon: Trophy,
      label: "Quiz cleared",
      hint: "Pass any lecture quiz",
      earned: stats.quizzesPassed > 0,
    },
    {
      id: "lecture",
      icon: Award,
      label: "Lecture complete",
      hint: "Finish every section of a lecture",
      earned: stats.lecturesCompleted > 0,
    },
  ];

  return (
    <Card className="grid content-start gap-4 p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Your progress</h2>
        <span className="font-mono text-sm font-semibold text-brand tabular-nums">
          {formatPercent(stats.ratio)}
        </span>
      </header>

      <ProgressBar value={stats.ratio} label="Course progress" tone={stats.ratio >= 1 ? "positive" : "brand"} />

      <p className="text-sm text-muted">
        {stats.lecturesCompleted} of {stats.totalLectures} lectures completed ·{" "}
        {stats.quizzesPassed} {stats.quizzesPassed === 1 ? "quiz" : "quizzes"} cleared
      </p>

      <ul className="grid gap-2">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <li
              key={badge.id}
              className={
                badge.earned
                  ? "flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent-soft/50 px-3 py-2"
                  : "flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 opacity-60"
              }
            >
              <Icon size={16} className={badge.earned ? "text-accent" : "text-faint"} aria-hidden />
              <span className="text-sm font-medium text-ink">{badge.label}</span>
              <span className="ml-auto text-xs text-faint">{badge.earned ? "earned" : badge.hint}</span>
            </li>
          );
        })}
      </ul>

      {stats.lecturesStarted > 0 ? (
        <button
          type="button"
          onClick={() => metas.forEach((meta) => resetLecture(meta.slug))}
          className="inline-flex w-fit items-center gap-1.5 text-xs text-faint transition-colors hover:text-danger"
        >
          <RotateCcw size={12} aria-hidden />
          Reset all progress
        </button>
      ) : null}
    </Card>
  );
}
