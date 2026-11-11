"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, Play, RotateCcw, Send, X } from "lucide-react";
import type { QuizQuestion } from "@site/content/types";
import type { MockExamProps } from "@core/widgets";
import { Markdown } from "@site/components/content/Markdown";
import { DataTable } from "@site/components/content/DataTable";
import { Badge } from "@site/components/ui/Badge";
import { ProgressBar } from "@site/components/ui/ProgressBar";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";
import { useSite } from "@site/site/context";

interface PoolQuestion {
  key: string;
  source: string;
  sourceLabel: string;
  href: string | null;
  question: QuizQuestion;
}

const MIXED_SOURCE = "mixed";

const LENGTHS = [10, 20, 30, 45];
const SECONDS_PER_QUESTION = 90;

type Phase = "setup" | "running" | "done";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function MockExam({ questionCount, minutes }: MockExamProps = {}) {
  const { data, paths } = useSite();
  const pool = useMemo<PoolQuestion[]>(
    () => [
      ...data.index.flatMap((entry) =>
        entry.quiz.map((question) => ({
          key: `${entry.meta.slug}:${question.id}`,
          source: entry.meta.slug,
          sourceLabel: `L${entry.meta.number} · ${entry.meta.title}`,
          href: `${paths.lecture(entry.meta.slug)}#quiz`,
          question,
        })),
      ),
      ...(data.exam?.quiz ?? []).map((question) => ({
        key: `exam:${question.id}`,
        source: MIXED_SOURCE,
        sourceLabel: "Cross-lecture",
        href: null,
        question,
      })),
    ],
    [data.index, data.exam, paths],
  );

  const sources = useMemo(
    () => [
      ...data.index.map((entry) => ({ id: entry.meta.slug, label: `L${entry.meta.number}`, title: entry.meta.title })),
      { id: MIXED_SOURCE, label: "Mixed", title: "Cross-lecture questions" },
    ],
    [data.index],
  );

  const defaultLength = questionCount ?? 20;
  const lengths = LENGTHS.includes(defaultLength) ? LENGTHS : [...LENGTHS, defaultLength].sort((a, b) => a - b);
  const secondsPerQuestion = minutes ? Math.max(10, Math.round((minutes * 60) / defaultLength)) : SECONDS_PER_QUESTION;
  const [phase, setPhase] = useState<Phase>("setup");
  const [length, setLength] = useState(defaultLength);
  const [selected, setSelected] = useState<string[]>(() => sources.map((source) => source.id));
  const [timed, setTimed] = useState(true);
  const [questions, setQuestions] = useState<PoolQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);

  const available = useMemo(() => pool.filter((entry) => selected.includes(entry.source)), [pool, selected]);

  const submit = useCallback(() => setPhase("done"), [setPhase]);

  useEffect(() => {
    if (phase !== "running" || !timed) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setPhase("done");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, timed]);

  function start() {
    const drawn = shuffle(available).slice(0, Math.min(length, available.length));
    setQuestions(drawn);
    setAnswers({});
    setRemaining(drawn.length * secondsPerQuestion);
    setPhase("running");
  }

  function toggleSource(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  const correct = questions.filter((entry) => answers[entry.key] === entry.question.answerId).length;
  const answered = Object.keys(answers).length;

  if (phase === "setup") {
    return (
      <div className="grid gap-5">
        <div className="grid gap-2">
          <span className="text-sm font-medium text-ink">Lectures in the draw</span>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                title={source.title}
                onClick={() => toggleSource(source.id)}
                aria-pressed={selected.includes(source.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors",
                  selected.includes(source.id)
                    ? "border-brand/50 bg-brand-soft text-brand-strong"
                    : "border-line bg-surface text-faint hover:border-brand/40",
                )}
              >
                {source.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected(selected.length === sources.length ? [] : sources.map((source) => source.id))}
              className="rounded-lg px-2.5 py-1 text-sm text-muted underline-offset-2 hover:underline"
            >
              {selected.length === sources.length ? "None" : "All"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Questions</span>
          {lengths.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLength(value)}
              aria-pressed={length === value}
              className={cn(
                "rounded-lg border px-3 py-1 text-sm font-medium tabular-nums transition-colors",
                length === value
                  ? "border-brand/50 bg-brand-soft text-brand-strong"
                  : "border-line bg-surface text-muted hover:border-brand/40",
              )}
            >
              {value}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} className="accent-brand" />
            Timed ({secondsPerQuestion} s per question)
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-sunken px-4 py-3">
          <p className="text-sm text-muted">
            {available.length} questions available
            {available.length < length ? ` — the test will have ${available.length}` : ""}. No feedback until you hand in.
          </p>
          <button
            type="button"
            onClick={start}
            disabled={available.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play size={14} aria-hidden />
            Start the test
          </button>
        </div>
      </div>
    );
  }

  const breakdown = sources.map((source) => {
    const ofSource = questions.filter((entry) => entry.source === source.id);
    const right = ofSource.filter((entry) => answers[entry.key] === entry.question.answerId).length;
    return { source, total: ofSource.length, right };
  }).filter((row) => row.total > 0);

  return (
    <div className="grid gap-5">
      {phase === "running" ? (
        <div className="sticky top-20 z-10 grid gap-2 rounded-xl border border-line bg-elevated/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone={timed && remaining < 60 ? "danger" : "neutral"}>
              <Clock size={12} aria-hidden />
              {timed ? formatClock(remaining) : "untimed"}
            </Badge>
            <span className="text-sm text-muted tabular-nums">
              {answered} / {questions.length} answered
            </span>
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink hover:opacity-90"
            >
              <Send size={14} aria-hidden />
              Hand in
            </button>
          </div>
          <ProgressBar value={questions.length ? answered / questions.length : 0} label="Answered" />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Score" value={`${correct} / ${questions.length}`} tone="brand" />
            <Stat
              label="Percentage"
              value={`${questions.length ? Math.round((correct / questions.length) * 100) : 0}%`}
              tone={correct / Math.max(1, questions.length) >= 0.7 ? "positive" : "warning"}
            />
            <Stat label="Unanswered" value={String(questions.length - answered)} />
          </div>
          <DataTable
            headers={["Lecture", "Correct", "Revise?"]}
            rows={breakdown.map((row) => [
              `${row.source.label} · ${row.source.title}`,
              `${row.right} / ${row.total}`,
              row.right === row.total ? "—" : "Yes: reread the explanations below and the lecture",
            ])}
            caption="Where your points went."
          />
          <button
            type="button"
            onClick={() => setPhase("setup")}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand/40 hover:bg-brand-soft"
          >
            <RotateCcw size={14} aria-hidden />
            New test
          </button>
        </div>
      )}

      <ol className="grid gap-6">
        {questions.map((entry, index) => {
          const chosen = answers[entry.key];
          const done = phase === "done";
          const right = chosen === entry.question.answerId;
          return (
            <li key={entry.key} className="grid gap-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  <span className="mr-2 text-faint tabular-nums">{index + 1}.</span>
                  {entry.question.prompt}
                </p>
                <span className="text-xs text-faint">{entry.sourceLabel}</span>
              </div>
              <div className="grid gap-1.5">
                {entry.question.options.map((option) => {
                  const isChosen = chosen === option.id;
                  const isCorrect = option.id === entry.question.answerId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={done}
                      onClick={() => setAnswers((current) => ({ ...current, [entry.key]: option.id }))}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2 text-left text-sm transition-colors disabled:cursor-default",
                        !done && isChosen && "border-brand/60 bg-brand-soft text-ink",
                        !done && !isChosen && "border-line bg-surface hover:border-brand/50",
                        done && isCorrect && "border-positive/40 bg-positive-soft text-ink",
                        done && isChosen && !isCorrect && "border-danger/40 bg-danger-soft text-ink",
                        done && !isChosen && !isCorrect && "border-line bg-surface text-faint",
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {done && isCorrect ? (
                          <Check size={16} className="text-positive" aria-hidden />
                        ) : done && isChosen ? (
                          <X size={16} className="text-danger" aria-hidden />
                        ) : (
                          <span
                            className={cn(
                              "grid size-4 place-items-center rounded-full border text-[10px] font-semibold",
                              isChosen ? "border-brand bg-brand text-brand-ink" : "border-line-strong text-faint",
                            )}
                          >
                            {option.id.toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>
              {done && !right ? (
                <div className="rounded-xl border border-line bg-sunken px-3.5 py-3">
                  <Markdown className="text-sm">{entry.question.explanation}</Markdown>
                  {entry.href ? (
                    <Link href={entry.href} className="mt-1 inline-block text-xs font-medium text-brand hover:underline">
                      Go to the lecture quiz →
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
