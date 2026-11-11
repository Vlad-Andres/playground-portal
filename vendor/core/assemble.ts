import type { Block, Concept, ExerciseSheet, LectureFile, LectureMeta as ContentLectureMeta, LectureSection, QuizQuestion, SectionOutline } from "./schema";

export type AssembledLectureMeta = ContentLectureMeta & { outline: SectionOutline[] };

export interface Lecture {
  meta: AssembledLectureMeta;
  concepts: Concept[];
  quiz: QuizQuestion[];
  sections: LectureSection[];
}

export interface LectureIndexEntry {
  meta: AssembledLectureMeta;
  concepts: Concept[];
  quiz: QuizQuestion[];
  exercises: ExerciseSheet[];
}

export function toLecture(file: LectureFile): Lecture {
  const outline = file.sections.map(({ id, title, kind }) => ({ id, title, kind }));
  return {
    ...file,
    meta: { ...file.meta, outline },
  };
}

function exerciseSheets(blocks: Block[]): ExerciseSheet[] {
  return blocks.flatMap((block) => (block.kind === "exercises" ? [block.sheet] : []));
}

export function toIndexEntry(lecture: Lecture): LectureIndexEntry {
  return {
    meta: lecture.meta,
    concepts: lecture.concepts,
    quiz: lecture.quiz,
    exercises: lecture.sections.flatMap((section) => exerciseSheets(section.blocks)),
  };
}
