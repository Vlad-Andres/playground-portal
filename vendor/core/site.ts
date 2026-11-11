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
