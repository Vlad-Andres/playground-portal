"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, Trophy, X } from "lucide-react";
import type { QuizQuestion } from "@site/content/types";
import { Markdown, StudyText } from "@site/components/content/Markdown";
import { useProgress } from "@site/hooks/useProgress";
import { QUIZ_PASS_RATIO } from "@site/lib/progress";
import { cn } from "@site/lib/cn";
import { announceStudyEvent } from "@site/lib/studyEvents";

interface QuizCardProps {
  lectureSlug: string;
  sectionId: string;
  questions: QuizQuestion[];
  sourceLabel?: string;
}

export function QuizCard({ lectureSlug, sectionId, questions, sourceLabel }: QuizCardProps) {
  const { recordQuizResult } = useProgress();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [position, setPosition] = useState(0);

  const answeredCount = Object.keys(answers).length;
  const correctCount = useMemo(
    () => questions.filter((question) => answers[question.id] === question.answerId).length,
    [answers, questions],
  );
  const finished = questions.length > 0 && answeredCount === questions.length;
  const passed = finished && correctCount / questions.length >= QUIZ_PASS_RATIO;

  useEffect(() => {
    if (finished) recordQuizResult(lectureSlug, sectionId, correctCount, questions.length);
  }, [finished, correctCount, questions.length, lectureSlug, sectionId, recordQuizResult]);

  // Announce each finished attempt once; a retry clears the quiz and starts a new attempt.
  const announced = useRef(false);
  useEffect(() => {
    if (!finished) {
      announced.current = false;
      return;
    }
    if (announced.current) return;
    announced.current = true;
    announceStudyEvent("quiz_completed");
  }, [finished]);

  const question = questions[position];
  if (!question) return null;

  const selected = answers[question.id];
  const isAnswered = selected !== undefined;
  const isRight = selected === question.answerId;

  return (
    <div className="grid min-w-0 gap-4">
      <span aria-live="polite" className="course-quiz-counter w-fit px-3 py-1.5 font-mono text-xs tracking-widest uppercase">
        Quiz / {String(position + 1).padStart(2, "0")} of {String(questions.length).padStart(2, "0")}
      </span>

      <p className="text-xl leading-snug font-semibold text-ink sm:text-2xl">
        <StudyText>{question.prompt}</StudyText>
      </p>

      <div className="grid gap-3">
        {question.options.map((option, index) => {
          const correct = isAnswered && option.id === question.answerId;
          const wrong = selected === option.id && !correct;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isAnswered}
              data-result={correct ? "correct" : wrong ? "wrong" : undefined}
              onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: option.id }))}
              className={cn(
                "course-quiz-choice flex w-full items-center gap-3 border px-3.5 py-2.5 text-left text-base transition-colors disabled:cursor-default",
                correct ? "border-brand text-ink" : wrong ? "border-danger bg-danger-soft text-ink" : "border-line text-ink",
                !isAnswered && "hover:border-brand hover:bg-brand-soft/40",
              )}
            >
              <span className={cn(
                "grid size-8 shrink-0 place-items-center font-mono text-sm",
                correct ? "bg-brand text-brand-ink" : "bg-canvas text-ink",
              )} aria-hidden>
                {String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 flex-1 break-words"><StudyText>{option.text}</StudyText></span>
              {correct ? <Check size={20} className="shrink-0 text-brand" aria-label="Correct answer" /> : null}
              {wrong ? <X size={20} className="shrink-0 text-danger" aria-label="Incorrect answer" /> : null}
            </button>
          );
        })}
      </div>

      {isAnswered ? (
        <div role="status" className={cn("animate-rise grid gap-1.5 px-4 py-3", isRight ? "course-quiz-feedback text-[#1d1a36]" : "border border-line bg-sunken")}>
          <p className="font-bold">{isRight ? "Exactly." : "Review the correct answer."}</p>
          <Markdown className={cn("text-sm", isRight && "[&_.text-muted]:text-[#1d1a36] [&_.text-ink]:text-[#1d1a36]")}>
            {question.explanation}
          </Markdown>
        </div>
      ) : null}

      {isAnswered && sourceLabel ? (
        <a href="#lecture-sources" className="course-editorial-label w-fit hover:underline">Source / {sourceLabel} ↗</a>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 text-sm">
        <span className="font-mono text-xs text-muted">{answeredCount} / {questions.length} answered</span>
        <div className="flex gap-2">
          {position > 0 ? (
            <button type="button" onClick={() => setPosition(position - 1)} className="border border-line px-3 py-1.5 hover:border-brand">Previous</button>
          ) : null}
          {position < questions.length - 1 ? (
            <button type="button" onClick={() => setPosition(position + 1)} disabled={!isAnswered}
              className="border border-line px-3 py-1.5 hover:border-brand disabled:opacity-45">
              Next question
            </button>
          ) : null}
        </div>
      </div>

      {finished ? (
        <footer className="animate-rise flex flex-wrap items-center justify-between gap-3 border border-line bg-sunken px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Trophy size={16} className={passed ? "text-accent" : "text-faint"} aria-hidden />
            {passed ? `Cleared with ${correctCount} of ${questions.length}.`
              : `${correctCount} of ${questions.length}. Review the explanations and retry.`}
          </p>
          <button type="button" className="inline-flex items-center gap-1.5 border border-line bg-surface px-3 py-1.5 text-sm font-medium"
            onClick={() => { setAnswers({}); setPosition(0); }}>
            <RotateCcw size={14} aria-hidden /> Retry
          </button>
        </footer>
      ) : null}
    </div>
  );
}
