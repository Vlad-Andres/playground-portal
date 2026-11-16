"use client";

import { notFound } from "next/navigation";
import type { SiteData } from "@core/site";
import { LectureHeader } from "@site/components/lecture/LectureHeader";
import { LectureSectionView } from "@site/components/lecture/LectureSectionView";
import { LectureToc } from "@site/components/lecture/LectureToc";

export function ExamScreen({ data }: { data: SiteData }) {
  const exam = data.exam;
  if (!exam) notFound();

  return (
    <div className="course-reading grid min-w-0 gap-8">
      <LectureHeader meta={exam.meta} badge="Final test" />

      <details className="border-b border-line pb-3">
        <summary className="course-editorial-label cursor-pointer">In this exam</summary>
        <div className="mt-3">
          <LectureToc meta={exam.meta} progressLabel="Exam training progress" />
        </div>
      </details>

      <article className="grid min-w-0 gap-12">
        {exam.sections.map((section) => (
          <LectureSectionView key={section.id} lecture={exam} section={section} />
        ))}
      </article>
    </div>
  );
}
