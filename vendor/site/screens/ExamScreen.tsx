"use client";

import { notFound } from "next/navigation";
import type { SiteData } from "@core/site";
import { LectureAssistant } from "@site/components/assistant/LectureAssistant";
import { LectureHeader } from "@site/components/lecture/LectureHeader";
import { LectureSectionView } from "@site/components/lecture/LectureSectionView";
import { LectureToc } from "@site/components/lecture/LectureToc";
import { lectureToContext } from "@site/lib/assistant/lectureContext";

export function ExamScreen({ data }: { data: SiteData }) {
  const exam = data.exam;
  if (!exam) notFound();
  const sectionTitles = Object.fromEntries(exam.sections.map((section) => [section.id, section.title]));

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-24 sm:px-6 sm:pt-14">
      <LectureHeader meta={exam.meta} badge="Final test" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
          <LectureToc meta={exam.meta} progressLabel="Exam training progress" />
        </aside>

        <article data-assistant-scope className="grid gap-14 lg:col-start-1 lg:row-start-1">
          {exam.sections.map((section) => (
            <LectureSectionView key={section.id} lecture={exam} section={section} />
          ))}
        </article>
      </div>

      <LectureAssistant
        slug={exam.meta.slug}
        label="Exam training"
        context={lectureToContext(exam)}
        sectionTitles={sectionTitles}
      />
    </div>
  );
}
