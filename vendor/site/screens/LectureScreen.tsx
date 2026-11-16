"use client";

import { notFound } from "next/navigation";
import type { SiteData } from "@core/site";
import { LectureHeader } from "@site/components/lecture/LectureHeader";
import { LectureNav } from "@site/components/lecture/LectureNav";
import { LectureSectionView } from "@site/components/lecture/LectureSectionView";
import { LectureToc } from "@site/components/lecture/LectureToc";
import { findLecture } from "@site/content/lectures";
import { neighbourLectures } from "@site/content/registry";

export function LectureScreen({ data, slug }: { data: SiteData; slug: string }) {
  const lecture = findLecture(data.lectures, slug);
  if (!lecture) notFound();

  const { previous, next } = neighbourLectures(data.index, slug);

  return (
    <div className="course-reading grid min-w-0 gap-8">
      <LectureHeader meta={lecture.meta} />

      <details className="border-b border-line pb-3">
        <summary className="course-editorial-label cursor-pointer">In this lecture</summary>
        <div className="mt-3">
          <LectureToc meta={lecture.meta} />
        </div>
      </details>

      <article className="grid min-w-0 gap-12">
        {lecture.sections.map((section) => (
          <LectureSectionView key={section.id} lecture={lecture} section={section} />
        ))}
      </article>

      <LectureNav previous={previous} next={next} />
    </div>
  );
}
