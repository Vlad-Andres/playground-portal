"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Trophy, X } from "lucide-react";
import type { QuizQuestion } from "@site/content/types";
import { Markdown } from "@site/components/content/Markdown";
import { Badge } from "@site/components/ui/Badge";
import { Card } from "@site/components/ui/Card";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { useProgress } from "@site/hooks/useProgress";
import { QUIZ_PASS_RATIO } from "@site/lib/progress";
import { cn } from "@site/lib/cn";

interface QuizCardProps {
  lectureSlug: string;
  sectionId: string;
  questions: QuizQuestion[];
}

export function QuizCard({ lectureSlug, sectionId, questions }: QuizCardProps) {
  const { recordQuizResult } = useProgress();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const answeredCount = Object.keys(answers).length;
  const correctCount = useMemo(
    () => questions.filter((question) => answers[question.id] === question.answerId).length,
    [answers, questions],
  );
  const finished = answeredCount === questions.length;
  const passed = finished && correctCount / questions.length >= QUIZ_PASS_RATIO;

  useEffect(() => {
    if (finished) recordQuizResult(lectureSlug, sectionId, correctCount, questions.length);
  }, [finished, correctCount, questions.length, lectureSlug, sectionId, recordQuizResult]);

  return (
    <Card className="grid gap-5 p-5 sm:p-6">
      <header className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Pick an answer to reveal the explanation. {Math.round(QUIZ_PASS_RATIO * 100)}% clears the
          lecture.
        </p>
        <Badge tone={finished ? (passed ? "positive" : "warning") : "neutral"}>
          {correctCount} / {questions.length} correct
        </Badge>
      </header>

      <ProgressBar
        value={answeredCount / questions.length}
        label="Quiz progress"
        tone={passed ? "positive" : "brand"}
      />

      <ol className="grid gap-5">
        {questions.map((question, index) => {
          const selected = answers[question.id];
          const isAnswered = selected !== undefined;

          return (
            <li key={question.id} className="grid gap-3">
              <p className="text-sm font-medium text-ink">
                <span className="mr-2 text-faint tabular-nums">{index + 1}.</span>
                {question.prompt}
              </p>

              <div className="grid gap-2">
                {question.options.map((option) => {
                  const isCorrect = option.id === question.answerId;
                  const isChosen = selected === option.id;
                  const reveal = isAnswered && (isChosen || isCorrect);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isAnswered}
                      onClick={() =>
                        setAnswers((previous) => ({ ...previous, [question.id]: option.id }))
                      }
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                        "disabled:cursor-default",
                        !isAnswered && "border-line bg-surface hover:border-brand/50 hover:bg-brand-soft/40",
                        reveal && isCorrect && "border-positive/40 bg-positive-soft text-ink",
                        reveal && !isCorrect && "border-danger/40 bg-danger-soft text-ink",
                        isAnswered && !reveal && "border-line bg-surface text-faint",
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {reveal && isCorrect ? (
                          <Check size={16} className="text-positive" aria-hidden />
                        ) : reveal ? (
                          <X size={16} className="text-danger" aria-hidden />
                        ) : (
                          <span className="grid size-4 place-items-center rounded-full border border-line-strong text-[10px] font-semibold text-faint">
                            {option.id.toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswered ? (
                <div className="animate-rise rounded-xl border border-line bg-sunken px-3.5 py-3">
                  <Markdown className="text-sm">{question.explanation}</Markdown>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {finished ? (
        <footer className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-sunken px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Trophy size={16} className={passed ? "text-accent" : "text-faint"} aria-hidden />
            {passed
              ? `Cleared with ${correctCount} of ${questions.length}.`
              : `${correctCount} of ${questions.length}. Review the explanations and retry.`}
          </p>
          <button
            type="button"
            onClick={() => setAnswers({})}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:bg-brand-soft"
          >
            <RotateCcw size={14} aria-hidden />
            Retry
          </button>
        </footer>
      ) : null}
    </Card>
  );
}
