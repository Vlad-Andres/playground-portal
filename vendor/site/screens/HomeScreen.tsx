"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, Target } from "lucide-react";
import type { SiteData } from "@core/site";
import { ContinueStudying } from "@site/components/home/ContinueStudying";
import { CourseOverview } from "@site/components/home/CourseOverview";
import { CourseWelcome } from "@site/components/home/CourseWelcome";
import { DueToday } from "@site/components/home/DueToday";
import { ExamCountdown } from "@site/components/home/ExamCountdown";
import { LectureCard } from "@site/components/home/LectureCard";
import { ProgressSummary } from "@site/components/home/ProgressSummary";
import { StudyNext } from "@site/components/home/StudyNext";
import { countExercises } from "@site/content/registry";
import { useSite } from "@site/site/context";

export function HomeScreen({ data }: { data: SiteData }) {
  const { paths } = useSite();
  const metas = data.index.map((entry) => entry.meta);

  return (
    <div className="course-reading grid min-w-0 gap-8 sm:gap-12">
      <ExamCountdown examDate={data.course.examDate} />
      <CourseOverview course={data.course} entries={data.index} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <ContinueStudying metas={metas} />
        <ProgressSummary metas={metas} />
      </div>

      <StudyNext metas={metas} />
      <DueToday />

      {data.exam ? <Link
        href={paths.exam}
        className="group flex flex-wrap items-center gap-4 rounded-2xl border border-brand/30 bg-brand-soft/40 px-5 py-4 transition-colors hover:border-brand/60"
      >
        <GraduationCap size={28} className="shrink-0 text-brand" aria-hidden />
        <span className="grid flex-1 gap-0.5">
          <span className="text-base font-semibold text-ink">Practice exam</span>
          <span className="text-sm text-muted">
            A timed practice test built from the lecture questions, with a score per lecture to show what to revisit.
          </span>
        </span>
        <ArrowRight size={18} className="text-brand transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link> : null}

      {data.expected.length > 0 ? <Link
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
      </Link> : null}

      {data.course.home ? <CourseWelcome home={data.course.home} /> : null}

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
    </div>
  );
}
