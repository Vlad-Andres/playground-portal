"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { QuizQuestion } from "@site/content/types";
import { Markdown } from "@site/components/content/Markdown";
import { cn } from "@site/lib/cn";

/** Lecture quiz questions linked to the flagged part, answered without touching lecture progress. */
export function MiniQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) {
    return <p className="text-sm text-muted">No quiz question of this lecture uses these key terms — try the lecture quiz.</p>;
  }

  return (
    <ol className="grid gap-5">
      {questions.map((question, index) => {
        const chosen = answers[question.id];
        return (
          <li key={question.id} className="grid gap-2">
            <p className="text-sm font-medium text-ink">
              <span className="mr-2 text-faint">{index + 1}.</span>
              {question.prompt}
            </p>
            {question.options.map((option) => {
              const isCorrect = option.id === question.answerId;
              const reveal = chosen !== undefined && (chosen === option.id || isCorrect);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={chosen !== undefined}
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm disabled:cursor-default",
                    chosen === undefined && "border-line bg-surface hover:border-brand/50",
                    reveal && isCorrect && "border-positive/40 bg-positive-soft",
                    reveal && !isCorrect && "border-danger/40 bg-danger-soft",
                    chosen !== undefined && !reveal && "border-line text-faint",
                  )}
                >
                  {reveal ? (
                    isCorrect ? <Check size={15} className="mt-0.5 text-positive" aria-hidden /> : <X size={15} className="mt-0.5 text-danger" aria-hidden />
                  ) : null}
                  {option.text}
                </button>
              );
            })}
            {chosen !== undefined ? (
              <div className="rounded-xl border border-line bg-sunken px-3 py-2">
                <Markdown className="text-sm">{question.explanation}</Markdown>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
