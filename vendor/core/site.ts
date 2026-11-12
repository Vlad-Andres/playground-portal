import { z } from "zod";
import { toIndexEntry, toLecture, type Lecture, type LectureIndexEntry } from "./assemble";
import {
  conceptSchema,
  courseSchema,
  exerciseSheetSchema,
  expectedTopicSchema,
  lectureMetaSchema,
  lectureSectionSchema,
  quizQuestionSchema,
  sectionOutlineSchema,
  type Course,
  type ExpectedTopic,
  type LectureFile,
} from "./schema";

/**
 * Everything the UI renders for one course. The template builds it from its own
 * `content/generated` files; the portal builds it from a stored course bundle.
 */
export interface SiteData {
  key: string;
  course: Course;
  lectures: Lecture[];
  index: LectureIndexEntry[];
  exam: Lecture | null;
  expected: ExpectedTopic[];
}

export interface SiteDataInput {
  key: string;
  course: Course;
  lectures: LectureFile[];
  exam: LectureFile | null;
  expected: ExpectedTopic[];
}

/** Assemble a `SiteData` value: sort the lectures and derive the index from them. */
export function buildSiteData(input: SiteDataInput): SiteData {
  const lectures = input.lectures
    .map(toLecture)
    .sort((a, b) => a.meta.number - b.meta.number);
  return {
    key: input.key,
    course: input.course,
    lectures,
    index: lectures.map(toIndexEntry),
    exam: input.exam ? toLecture(input.exam) : null,
    expected: input.expected,
  };
}

/** Feature switches; each is on unless the course sets it to false. */
export function siteFeatures(course: Course) {
  return {
    assistant: course.features?.assistant !== false,
    difficult: course.features?.difficult !== false,
    search: course.features?.search !== false,
  };
}

const assembledMetaSchema = lectureMetaSchema
  .extend({ outline: z.array(sectionOutlineSchema) })
  .strict();

const assembledLectureSchema = z
  .object({
    meta: assembledMetaSchema,
    concepts: z.array(conceptSchema),
    quiz: z.array(quizQuestionSchema),
    sections: z.array(lectureSectionSchema).min(1),
  })
  .strict();

const lectureIndexEntrySchema = z
  .object({
    meta: assembledMetaSchema,
    concepts: z.array(conceptSchema),
    quiz: z.array(quizQuestionSchema),
    exercises: z.array(exerciseSheetSchema),
  })
  .strict();

export const siteDataSchema: z.ZodType<SiteData> = z
  .object({
    key: z.string().min(1),
    course: courseSchema,
    lectures: z.array(assembledLectureSchema),
    index: z.array(lectureIndexEntrySchema),
    exam: assembledLectureSchema.nullable(),
    expected: z.array(expectedTopicSchema),
  })
  .strict();

/** A stored lecture back as a lecture file (without the derived outline). */
export function toLectureFile(lecture: Lecture): LectureFile {
  const { outline: _outline, ...meta } = lecture.meta;
  void _outline;
  return { meta, concepts: lecture.concepts, quiz: lecture.quiz, sections: lecture.sections };
}

const EXAM_QUESTIONS_PER_LECTURE = 3;

function uniqueSlug(slug: string, taken: Set<string>): string {
  if (!taken.has(slug)) return slug;
  let suffix = 2;
  while (taken.has(`${slug}-${suffix}`)) suffix += 1;
  return `${slug}-${suffix}`;
}

/** New lectures after the existing ones (numbered on, slugs made unique); existing lectures are never touched. */
export function appendLectures(site: SiteData, files: LectureFile[]): SiteData {
  const next = structuredClone(site);
  const taken = new Set(next.lectures.map((lecture) => lecture.meta.slug));
  let number = next.lectures.reduce((max, lecture) => Math.max(max, lecture.meta.number), 0);
  for (const file of structuredClone(files)) {
    number += 1;
    const slug = uniqueSlug(file.meta.slug, taken);
    taken.add(slug);
    const lecture = toLecture({ ...file, meta: { ...file.meta, number, slug } });
    next.lectures.push(lecture);
    if (next.exam) {
      next.exam.quiz.push(...lecture.quiz.slice(0, EXAM_QUESTIONS_PER_LECTURE).map((question) => ({ ...question, id: `l${number}-${question.id}` })));
    }
  }
  next.index = next.lectures.map(toIndexEntry);
  return next;
}

/** Replace lectures by slug (keeping their number and slug) and optionally the title and description. */
export function replaceLectures(site: SiteData, files: LectureFile[], course?: { title?: string; description?: string }): SiteData {
  const next = structuredClone(site);
  for (const file of structuredClone(files)) {
    const position = next.lectures.findIndex((lecture) => lecture.meta.slug === file.meta.slug);
    if (position < 0) continue;
    const { number, slug } = next.lectures[position].meta;
    next.lectures[position] = toLecture({ ...file, meta: { ...file.meta, number, slug } });
  }
  const title = course?.title?.trim();
  if (title && title.length <= 120) {
    if (next.course.shortTitle === next.course.title) next.course.shortTitle = title.slice(0, 24);
    next.course.title = title;
  }
  if (course?.description !== undefined && course.description.length <= 400) next.course.description = course.description;
  next.index = next.lectures.map(toIndexEntry);
  return next;
}
