import { z } from "zod";

export const LIMITS = { files: 12, pages: 400, characters: 600_000, lectures: 12, contextCharacters: 2_000, courseLectures: 24, refineNote: 1_000, refineLectures: 3 } as const;

export const LEVELS = ["school", "university", "professional"] as const;
export const DEPTHS = ["cram", "standard", "deep"] as const;

export const materialPageSchema = z.object({ n: z.number().int().positive(), text: z.string() }).strict();
export const materialSchema = z
  .object({ name: z.string().trim().min(1).max(200), pages: z.array(materialPageSchema).max(LIMITS.pages) })
  .strict();

export const briefSchema = z
  .object({
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/),
    level: z.enum(LEVELS),
    depth: z.enum(DEPTHS),
    examMode: z.boolean(),
    quizzes: z.boolean(),
    widgets: z.boolean(),
    title: z.string().trim().min(1).max(120).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    context: z.string().max(LIMITS.contextCharacters),
  })
  .strict();

export type MaterialPage = z.infer<typeof materialPageSchema>;
export type Material = z.infer<typeof materialSchema>;
export type Brief = z.infer<typeof briefSchema>;
export type Depth = Brief["depth"];

/** What the person asked for, before the course context is known. "auto" lets the generator decide. */
export interface CourseRequest {
  language: string;
  level: "auto" | (typeof LEVELS)[number];
  depth: Depth;
  examMode: boolean;
  quizzes: boolean;
  widgets: boolean;
  title?: string;
  accent?: string;
  context: string;
  /** The portal language of the person, e.g. "ro". */
  locale: string;
}

export const requestSchema: z.ZodType<CourseRequest> = z
  .object({
    language: z.union([z.literal("auto"), z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/)]),
    level: z.enum(["auto", ...LEVELS]),
    depth: z.enum(DEPTHS),
    examMode: z.boolean(),
    quizzes: z.boolean(),
    widgets: z.boolean(),
    title: z.string().trim().min(1).max(120).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    context: z.string().max(LIMITS.contextCharacters),
    locale: z.string().regex(/^[a-z]{2}$/),
  })
  .strict();
