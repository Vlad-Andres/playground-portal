"use client";

import { RotateCcw } from "lucide-react";
import type { ExerciseSheet } from "@site/content/types";
import { ExerciseAnswer } from "@site/components/content/ExerciseAnswer";
import { Markdown } from "@site/components/content/Markdown";
import { Badge } from "@site/components/ui/Badge";
import { Card } from "@site/components/ui/Card";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { useExerciseState } from "@site/hooks/useExerciseState";
import { sheetProgress } from "@site/lib/exercises";

export function ExerciseSheetView({ sheet }: { sheet: ExerciseSheet }) {
  const { state, resetSheet } = useExerciseState();
  const progress = sheetProgress(sheet, state);

  return (
    <div className="grid gap-5">
      <Card className="grid gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold text-ink">{sheet.title}</h3>
            <p className="text-sm text-muted">{sheet.description}</p>
          </div>
          <Badge tone={progress.answered === progress.total ? "positive" : "neutral"}>
            {progress.answered} / {progress.total} answered
          </Badge>
        </div>

        <ProgressBar
          value={progress.total === 0 ? 0 : progress.answered / progress.total}
          label={`${sheet.title} progress`}
          tone={progress.answered === progress.total ? "positive" : "brand"}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">
            {progress.correct} marked correct · {progress.autoGradable} of {progress.total} parts are
            graded automatically · {sheet.source}
          </p>
          {progress.answered > 0 ? (
            <button
              type="button"
              onClick={() => resetSheet(sheet.id)}
              className="inline-flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-danger"
            >
              <RotateCcw size={12} aria-hidden />
              Clear my answers
            </button>
          ) : null}
        </div>
      </Card>

      {sheet.exercises.map((exercise, exerciseIndex) => (
        <Card key={exercise.id} id={`exercise-${exercise.id}`} as="article" className="grid scroll-mt-24 gap-4 p-5 sm:p-6">
          <header className="grid gap-2">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              Exercise {exerciseIndex + 1}
            </p>
            <h4 className="text-base font-semibold text-ink">{exercise.title}</h4>
            {exercise.intro ? <Markdown className="text-sm">{exercise.intro}</Markdown> : null}
          </header>

          <ol className="grid gap-4">
            {exercise.tasks.map((task, taskIndex) => (
              <ExerciseAnswer key={task.id} sheetId={sheet.id} task={task} index={taskIndex} />
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}
