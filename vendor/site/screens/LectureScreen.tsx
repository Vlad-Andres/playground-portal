"use client";

import { notFound } from "next/navigation";
import type { SiteData } from "@core/site";
import { siteFeatures } from "@core/site";
import { LectureAssistant } from "@site/components/assistant/LectureAssistant";
import { LectureHeader } from "@site/components/lecture/LectureHeader";
import { LectureNav } from "@site/components/lecture/LectureNav";
import { LectureSectionView } from "@site/components/lecture/LectureSectionView";
import { LectureToc } from "@site/components/lecture/LectureToc";
import { findLecture } from "@site/content/lectures";
import { neighbourLectures } from "@site/content/registry";
import { lectureToContext } from "@site/lib/assistant/lectureContext";

export function LectureScreen({ data, slug }: { data: SiteData; slug: string }) {
  const lecture = findLecture(data.lectures, slug);
  if (!lecture) notFound();

  const { previous, next } = neighbourLectures(data.index, slug);
  const sectionTitles = Object.fromEntries(lecture.sections.map((section) => [section.id, section.title]));

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-24 sm:px-6 sm:pt-14">
      <LectureHeader meta={lecture.meta} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
          <LectureToc meta={lecture.meta} />
        </aside>

        <article data-assistant-scope className="grid gap-14 lg:col-start-1 lg:row-start-1">
          {lecture.sections.map((section) => (
            <LectureSectionView key={section.id} lecture={lecture} section={section} />
          ))}
        </article>
      </div>

      <LectureNav previous={previous} next={next} />

      {siteFeatures(data.course).assistant ? (
        <LectureAssistant
          slug={lecture.meta.slug}
          label={`Lecture ${lecture.meta.number} · ${lecture.meta.title}`}
          context={lectureToContext(lecture)}
          sectionTitles={sectionTitles}
        />
      ) : null}
    </div>
  );
}
