"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock, ListChecks, PencilRuler } from "lucide-react";
import type { LectureMeta } from "@site/content/types";
import { Badge, type BadgeTone } from "@site/components/ui/Badge";
import { Card } from "@site/components/ui/Card";
import { ProgressRing } from "@site/components/ui/ProgressRing";
import { useProgress } from "@site/hooks/useProgress";
import { lectureStats } from "@site/lib/progress";
import { formatMinutes } from "@site/lib/format";
import { useSite } from "@site/site/context";

const DIFFICULTY_TONE: Record<LectureMeta["difficulty"], BadgeTone> = {
  intro: "positive",
  core: "brand",
  advanced: "danger",
};

interface LectureCardProps {
  meta: LectureMeta;
  conceptCount: number;
  quizCount: number;
  exerciseCount: number;
}

export function LectureCard({ meta, conceptCount, quizCount, exerciseCount }: LectureCardProps) {
  const { paths } = useSite();
  const { progress } = useProgress();
  const stats = lectureStats(progress, meta);

  return (
    <Card as="article" className="group relative grid content-start gap-4 p-5 transition-colors hover:border-brand/40">
      <header className="flex items-start gap-4">
        <div className="grid flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Lecture {meta.number}</Badge>
            <Badge tone={DIFFICULTY_TONE[meta.difficulty]}>{meta.difficulty}</Badge>
            {stats.completed ? <Badge tone="positive">completed</Badge> : null}
          </div>
          <h3 className="text-lg font-semibold text-ink">
            <Link href={paths.lecture(meta.slug)} className="after:absolute after:inset-0">
              {meta.title}
            </Link>
          </h3>
          <p className="text-sm text-muted">{meta.subtitle}</p>
        </div>
        <ProgressRing value={stats.ratio} label={`Lecture ${meta.number} progress`} />
      </header>

      <p className="line-clamp-3 text-sm text-muted">{meta.summary}</p>

      <div className="flex flex-wrap gap-1.5">
        {meta.topics.slice(0, 4).map((topic) => (
          <Badge key={topic} tone="brand">
            {topic}
          </Badge>
        ))}
        {meta.topics.length > 4 ? <Badge>+{meta.topics.length - 4}</Badge> : null}
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-faint">
        <span className="flex items-center gap-1.5">
          <Clock size={13} aria-hidden />
          {formatMinutes(meta.estimatedMinutes)}
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen size={13} aria-hidden />
          {conceptCount} concepts
        </span>
        <span className="flex items-center gap-1.5">
          <ListChecks size={13} aria-hidden />
          {quizCount} questions
        </span>
        {exerciseCount > 0 ? (
          <span className="flex items-center gap-1.5">
            <PencilRuler size={13} aria-hidden />
            {exerciseCount} exercises
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 font-medium text-brand">
          {stats.started ? "Continue" : "Start"}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </footer>
    </Card>
  );
}
