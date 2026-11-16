"use client";

import { StudyText } from "@site/components/content/Markdown";
import type { Block, Lecture, LectureSection, SectionKind } from "@site/content/types";
import { BlockRenderer } from "@site/components/content/BlockRenderer";
import { QuizCard } from "@site/components/content/QuizCard";
import { SectionCompleteToggle } from "@site/components/lecture/SectionCompleteToggle";
import { DifficultBlock } from "@site/components/difficult/DifficultBlock";
import { DifficultSectionToggle } from "@site/components/difficult/DifficultSectionToggle";
import { siteFeatures } from "@core/site";
import { useSite } from "@site/site/context";

const KIND_LABEL: Record<SectionKind, string> = {
  objectives: "Objectives",
  intuition: "Big picture",
  concepts: "Core concepts",
  visual: "Visual explanation",
  playground: "Interactive playground",
  examples: "Worked examples",
  mistakes: "Common mistakes",
  quiz: "Check understanding",
  exercises: "Practice",
  summary: "Summary",
};

/** Block kinds that can be flagged one by one; lists of objectives and exercise sheets cannot. */
const FLAGGABLE = new Set<Block["kind"]>([
  "prose", "info", "concepts", "formula", "code", "table", "figure", "steps", "timeline", "recall", "practice", "widget",
]);

interface LectureSectionViewProps {
  lecture: Lecture;
  section: LectureSection;
}

export function LectureSectionView({ lecture, section }: LectureSectionViewProps) {
  const { data } = useSite();
  const features = siteFeatures(data.course);
  const isQuiz = section.kind === "quiz" && lecture.quiz.length > 0;

  return (
    <section id={section.id} className="grid scroll-mt-24 gap-6">
      <header className={isQuiz ? "flex items-end justify-between gap-3 border-b border-line pb-4" : "flex items-end justify-between gap-3"}>
        <div className="grid gap-1">
          <p className="course-editorial-label">
            {isQuiz ? `Lecture ${String(lecture.meta.number).padStart(2, "0")} / ${lecture.meta.topics[0] ?? lecture.meta.title}` : KIND_LABEL[section.kind]}
          </p>
          <h2 className={isQuiz ? "text-3xl leading-tight font-semibold tracking-tight sm:text-4xl" : "text-2xl font-semibold tracking-tight"}><StudyText>{section.title}</StudyText></h2>
          {isQuiz ? <p className="mt-2 text-base text-muted">Choose an answer to reveal the explanation.</p> : null}
        </div>
        {features.difficult && section.kind !== "objectives" ? (
          <DifficultSectionToggle lectureSlug={lecture.meta.slug} sectionId={section.id} />
        ) : null}
      </header>

      {isQuiz ? (
        <QuizCard
          key={`${lecture.meta.slug}:${section.id}`}
          lectureSlug={lecture.meta.slug}
          sectionId={section.id}
          questions={lecture.quiz}
          sourceLabel={lecture.meta.sources.length ? `Lecture ${String(lecture.meta.number).padStart(2, "0")}` : undefined}
        />
      ) : null}

      {section.blocks.map((block, index) =>
        features.difficult && FLAGGABLE.has(block.kind) ? (
          <DifficultBlock key={index} lectureSlug={lecture.meta.slug} sectionId={section.id} blockIndex={index}>
            <BlockRenderer block={block} concepts={lecture.concepts} />
          </DifficultBlock>
        ) : (
          <BlockRenderer key={index} block={block} concepts={lecture.concepts} />
        ),
      )}

      <div className="flex justify-end border-t border-line pt-4">
        <SectionCompleteToggle lectureSlug={lecture.meta.slug} sectionId={section.id} />
      </div>
    </section>
  );
}
