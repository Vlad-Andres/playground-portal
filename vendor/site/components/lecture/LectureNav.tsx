"use client";

import { StudyText } from "@site/components/content/Markdown";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { LectureMeta } from "@site/content/types";
import { useSite } from "@site/site/context";

interface LectureNavProps {
  previous: LectureMeta | null;
  next: LectureMeta | null;
}

export function LectureNav({ previous, next }: LectureNavProps) {
  const { paths } = useSite();

  return (
    <nav aria-label="Lecture navigation" className="grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
      {previous ? (
        <Link
          href={paths.lecture(previous.slug)}
          className="group grid min-w-0 gap-1 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand/40"
        >
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" aria-hidden />
            Lecture {previous.number}
          </span>
          <span className="text-sm font-medium text-ink"><StudyText>{previous.title}</StudyText></span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={paths.lecture(next.slug)}
          className="group grid min-w-0 justify-items-end gap-1 rounded-xl border border-line bg-surface p-4 text-right transition-colors hover:border-brand/40 sm:col-start-2"
        >
          <span className="flex items-center gap-1.5 text-xs text-faint">
            Lecture {next.number}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-ink"><StudyText>{next.title}</StudyText></span>
        </Link>
      ) : (
        <span className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-faint sm:col-start-2">
          The next lecture appears here once its material is added.
        </span>
      )}
    </nav>
  );
}
