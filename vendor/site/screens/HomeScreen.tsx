"use client";

import Link from "next/link";
import { ArrowRight, Gamepad2, GraduationCap, Layers, Sparkles, Target } from "lucide-react";
import type { SiteData } from "@core/site";
import { ContinueStudying } from "@site/components/home/ContinueStudying";
import { CourseOverview } from "@site/components/home/CourseOverview";
import { ExamCountdown } from "@site/components/home/ExamCountdown";
import { LectureCard } from "@site/components/home/LectureCard";
import { ProgressSummary } from "@site/components/home/ProgressSummary";
import { Card } from "@site/components/ui/Card";
import { countExercises } from "@site/content/registry";
import { useSite } from "@site/site/context";

const PRINCIPLES = [
  {
    icon: Layers,
    title: "Intuition before formalism",
    body: "Every section opens with the picture and closes with the formula, so the notation always arrives attached to something you already believe.",
  },
  {
    icon: Gamepad2,
    title: "Playgrounds, not screenshots",
    body: "Thresholds, shingle sizes and hash functions are controls you move. The numbers recompute live, including the ones the lecture worked out by hand.",
  },
  {
    icon: Sparkles,
    title: "Nothing important removed",
    body: "Explanations stay short, but formulas, edge cases and the reasoning behind each trade-off are kept — this is a study companion, not a summary.",
  },
];

export function HomeScreen({ data }: { data: SiteData }) {
  const { paths } = useSite();
  const metas = data.index.map((entry) => entry.meta);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10 sm:px-6 sm:py-14">
      <ExamCountdown examDate={data.course.examDate} />
      <CourseOverview course={data.course} entries={data.index} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <ContinueStudying metas={metas} />
        <ProgressSummary metas={metas} />
      </div>

      <Link
        href={paths.exam}
        className="group flex flex-wrap items-center gap-4 rounded-2xl border border-brand/30 bg-brand-soft/40 px-5 py-4 transition-colors hover:border-brand/60"
      >
        <GraduationCap size={28} className="shrink-0 text-brand" aria-hidden />
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-semibold text-ink">Exam training</span>
          <span className="text-sm text-muted">
            A timed mock test from every lecture, exam-style open questions with model answers,
            pseudocode drills and a last-day checklist.
          </span>
        </span>
        <ArrowRight size={18} className="text-brand transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>

      <Link
        href={paths.expected}
        className="group -mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-brand/60"
      >
        <Target size={28} className="shrink-0 text-brand" aria-hidden />
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-semibold text-ink">Expected at the exam</span>
          <span className="text-sm text-muted">
            Only what the course says you must know, per lecture, in concise form. Tick off what you know and study the rest.
          </span>
        </span>
        <ArrowRight size={18} className="text-brand transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>

      <section id="lectures" className="grid scroll-mt-24 gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Lectures</h2>
          <p className="text-sm text-faint">In the order of the course schedule.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {data.index.map((entry) => (
            <LectureCard
              key={entry.meta.slug}
              meta={entry.meta}
              conceptCount={entry.concepts.length}
              quizCount={entry.quiz.length}
              exerciseCount={countExercises(entry)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <h2 className="text-xl font-semibold">How this site is built</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="grid content-start gap-2 p-5">
              <Icon size={18} className="text-brand" aria-hidden />
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <p className="text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
