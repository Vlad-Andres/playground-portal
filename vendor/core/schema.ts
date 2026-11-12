import { z } from "zod";
import { CUSTOM_HTML_MAX } from "./custom";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const courseId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const language = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/);
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

const sectionKind = z.enum([
  "objectives",
  "intuition",
  "concepts",
  "visual",
  "playground",
  "examples",
  "mistakes",
  "quiz",
  "exercises",
  "summary",
]);

export const sectionOutlineSchema = z
  .object({ id: identifier, title: z.string(), kind: sectionKind })
  .strict();

const sourceSchema = z
  .object({
    label: z.string(),
    kind: z.enum(["slides", "chapter", "notes"]),
    detail: z.string().optional(),
  })
  .strict();

const metaSchema = z
  .object({
    slug: identifier,
    number: nonNegativeInt,
    title: z.string(),
    subtitle: z.string(),
    summary: z.string(),
    topics: z.array(z.string()),
    difficulty: z.enum(["intro", "core", "advanced"]),
    estimatedMinutes: positiveInt,
    sources: z.array(sourceSchema),
    objectives: z.array(z.string()),
    takeaways: z.array(z.string()),
  })
  .strict();

const conceptSchema = z
  .object({
    id: identifier,
    term: z.string(),
    short: z.string(),
    detail: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

const quizOptionSchema = z.object({ id: identifier, text: z.string() }).strict();
const quizQuestionSchema = z
  .object({
    id: identifier,
    prompt: z.string(),
    options: z.array(quizOptionSchema).min(2).max(6),
    answerId: identifier,
    explanation: z.string(),
  })
  .strict();

const exerciseCheckSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("open"), palette: z.enum(["algebra"]).optional() }).strict(),
  z
    .object({ mode: z.literal("text"), accept: z.array(z.string()), placeholder: z.string().optional() })
    .strict(),
  z
    .object({ mode: z.literal("select"), options: z.array(z.string()), answer: z.array(z.string()) })
    .strict(),
]);

const exerciseTaskSchema = z
  .object({
    id: identifier,
    prompt: z.string(),
    check: exerciseCheckSchema,
    solution: z.string(),
    hint: z.string().optional(),
  })
  .strict();

const exerciseSchema = z
  .object({
    id: identifier,
    title: z.string(),
    intro: z.string().optional(),
    tasks: z.array(exerciseTaskSchema),
  })
  .strict();

export const exerciseSheetSchema = z
  .object({
    id: identifier,
    title: z.string(),
    description: z.string(),
    source: z.string(),
    exercises: z.array(exerciseSchema),
  })
  .strict();

const runConfigSchema = z
  .object({
    code: z.string().optional(),
    note: z.string().optional(),
    hint: z.string().optional(),
  })
  .strict();

const workedStepSchema = z.object({ title: z.string(), md: z.string() }).strict();
const timelineItemSchema = z
  .object({ label: z.string(), title: z.string(), md: z.string() })
  .strict();
const recallCardSchema = z.object({ prompt: z.string(), answer: z.string() }).strict();

const blockSourceSchema = z
  .array(z.object({ file: z.string().min(1), page: positiveInt }).strict())
  .min(1)
  .max(5);

const proseBlockSchema = z.object({ kind: z.literal("prose"), source: blockSourceSchema.optional(), md: z.string() }).strict();
const infoBlockSchema = z
  .object({
    kind: z.literal("info"), source: blockSourceSchema.optional(),
    variant: z.enum(["note", "insight", "warning", "pitfall"]),
    title: z.string(),
    md: z.string(),
  })
  .strict();
const conceptsBlockSchema = z.object({ kind: z.literal("concepts"), source: blockSourceSchema.optional(), ids: z.array(identifier) }).strict();
const formulaBlockSchema = z
  .object({ kind: z.literal("formula"), source: blockSourceSchema.optional(), tex: z.string(), caption: z.string().optional() })
  .strict();
const codeBlockSchema = z
  .object({
    kind: z.literal("code"), source: blockSourceSchema.optional(),
    lang: z.string(),
    code: z.string(),
    caption: z.string().optional(),
    run: z.union([runConfigSchema, z.literal(false)]).optional(),
  })
  .strict();
const tableBlockSchema = z
  .object({
    kind: z.literal("table"), source: blockSourceSchema.optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    caption: z.string().optional(),
  })
  .strict();
const figureBlockSchema = z
  .object({
    kind: z.literal("figure"), source: blockSourceSchema.optional(),
    src: z.string(),
    alt: z.string(),
    width: positiveInt,
    height: positiveInt,
    caption: z.string().optional(),
  })
  .strict();
const stepsBlockSchema = z
  .object({
    kind: z.literal("steps"), source: blockSourceSchema.optional(),
    title: z.string(),
    intro: z.string().optional(),
    steps: z.array(workedStepSchema),
  })
  .strict();
const timelineBlockSchema = z.object({ kind: z.literal("timeline"), source: blockSourceSchema.optional(), items: z.array(timelineItemSchema) }).strict();
const listBlockSchema = z
  .object({ kind: z.literal("list"), source: blockSourceSchema.optional(), variant: z.enum(["objectives", "takeaways"]), items: z.array(z.string()) })
  .strict();
const exercisesBlockSchema = z.object({ kind: z.literal("exercises"), source: blockSourceSchema.optional(), sheet: exerciseSheetSchema }).strict();
const recallBlockSchema = z.object({ kind: z.literal("recall"), source: blockSourceSchema.optional(), cards: z.array(recallCardSchema) }).strict();
const practiceBlockSchema = z
  .object({ kind: z.literal("practice"), source: blockSourceSchema.optional(), id: identifier, tasks: z.array(exerciseTaskSchema) })
  .strict();
const widgetBlockSchema = z
  .object({
    kind: z.literal("widget"), source: blockSourceSchema.optional(),
    type: identifier,
    title: z.string(),
    description: z.string().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
const customBlockSchema = z
  .object({
    kind: z.literal("custom"), source: blockSourceSchema.optional(),
    id: identifier,
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(300),
    html: z.string().min(1).max(CUSTOM_HTML_MAX),
    height: z.number().int().min(200).max(900).optional(),
  })
  .strict();

export const blockSchema = z.discriminatedUnion("kind", [
  proseBlockSchema,
  infoBlockSchema,
  conceptsBlockSchema,
  formulaBlockSchema,
  codeBlockSchema,
  tableBlockSchema,
  figureBlockSchema,
  stepsBlockSchema,
  timelineBlockSchema,
  listBlockSchema,
  exercisesBlockSchema,
  recallBlockSchema,
  practiceBlockSchema,
  widgetBlockSchema,
  customBlockSchema,
]);

const lectureSectionSchema = z
  .object({ id: identifier, title: z.string(), kind: sectionKind, blocks: z.array(blockSchema) })
  .strict();

export const courseSchema = z
  .object({
    id: courseId,
    title: z.string(),
    shortTitle: z.string(),
    description: z.string(),
    language,
    indexable: z.boolean(),
    overviewBadge: z.string().optional(),
    overviewTitle: z.string().optional(),
    overviewMd: z.string().optional(),
    footerText: z.string().optional(),
    level: z.enum(["school", "university", "professional"]).optional(),
    domains: z.array(z.enum(["core", "math", "cs", "memorise", "humanities"])).optional(),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    home: z
      .object({
        intro: z.string().max(1200).optional(),
        highlights: z.array(z.object({ title: z.string().max(80), md: z.string().max(400) }).strict()).max(4).optional(),
        studyPath: z.array(z.string().max(160)).max(6).optional(),
      })
      .strict()
      .optional(),
    theme: z
      .object({
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        corners: z.enum(["soft", "sharp"]).optional(),
      })
      .strict()
      .optional(),
    features: z
      .object({ assistant: z.boolean().optional(), difficult: z.boolean().optional(), search: z.boolean().optional() })
      .strict()
      .optional(),
  })
  .strict();

export const lectureFileSchema = z
  .object({
    meta: metaSchema,
    concepts: z.array(conceptSchema),
    quiz: z.array(quizQuestionSchema),
    sections: z.array(lectureSectionSchema).min(1),
  })
  .strict();

const expectedItemSchema = z
  .object({ id: identifier, title: z.string(), md: z.string() })
  .strict();
export const expectedTopicSchema = z
  .object({
    id: identifier,
    lectures: z.string(),
    title: z.string(),
    links: z.array(z.object({ slug: identifier, label: z.string() }).strict()),
    official: z.string(),
    items: z.array(expectedItemSchema),
  })
  .strict();

export const expectedFileSchema = z.array(expectedTopicSchema);

export type Course = z.infer<typeof courseSchema>;
export type LectureFile = z.infer<typeof lectureFileSchema>;
export type ExpectedTopic = z.infer<typeof expectedTopicSchema>;
export type SectionOutline = z.infer<typeof sectionOutlineSchema>;
export type SectionKind = SectionOutline["kind"];
export type LectureSource = z.infer<typeof sourceSchema>;
export type LectureMeta = z.infer<typeof metaSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type QuizOption = z.infer<typeof quizOptionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type InfoVariant = z.infer<typeof infoBlockSchema>["variant"];
export type ExerciseCheck = z.infer<typeof exerciseCheckSchema>;
export type ExerciseTask = z.infer<typeof exerciseTaskSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseSheet = z.infer<typeof exerciseSheetSchema>;
export type Block = z.infer<typeof blockSchema>;
export type LectureSection = z.infer<typeof lectureSectionSchema>;
export type RunConfig = z.infer<typeof runConfigSchema>;
export type WorkedStep = z.infer<typeof workedStepSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type RecallCard = z.infer<typeof recallCardSchema>;
export type BlockSource = z.infer<typeof blockSourceSchema>;
export type CourseTheme = NonNullable<Course["theme"]>;
export type CourseFeatures = NonNullable<Course["features"]>;

// Parts used by the generator to validate model output item by item.
export {
  conceptSchema,
  courseId as courseIdSchema,
  identifier as identifierSchema,
  lectureSectionSchema,
  metaSchema as lectureMetaSchema,
  quizQuestionSchema,
  sectionKind as sectionKindSchema,
};
