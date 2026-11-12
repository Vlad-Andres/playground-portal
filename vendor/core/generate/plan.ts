import { z } from "zod";
import { courseSchema, sectionKindSchema, type Course, type SectionKind } from "../schema";
import { renderMaterials } from "./ingest";
import { extractJson, type ModelClient } from "./model";
import { defaultContext, type CourseContext } from "./context";
import { designPrompt } from "./prompts";
import { LIMITS, type Brief, type Material } from "./types";

export const APPROACHES = ["follow-source", "by-topic", "problem-first", "exam-focused", "timeline"] as const;
export type Approach = (typeof APPROACHES)[number];

export interface PlannedLecture {
  number: number;
  slug: string;
  title: string;
  summary: string;
  /** 0..4 things the learner can do after this lecture. */
  goals: string[];
  pages: { file: string; from: number; to: number }[];
  sections: { id: string; title: string; kind: SectionKind; blocks: string[] }[];
}

export interface CoursePlan {
  course: Course;
  lectures: PlannedLecture[];
  exam?: { title: string; intro: string };
  approach: Approach;
  /** One sentence: why this structure fits the material. */
  why: string;
}

/** A different way to organise the same material: an outline only, written out if the person picks it. */
export interface DesignOutline {
  id: "alt-1" | "alt-2";
  approach: Approach;
  why: string;
  lectures: { slug: string; title: string; summary: string; pages: { file: string; from: number; to: number }[] }[];
}

export interface CourseDesign {
  recommended: CoursePlan;
  alternatives: DesignOutline[];
}

export const plannedLectureSchema = z.object({
  number: z.number().int().nonnegative(),
  slug: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  summary: z.string().max(600),
  goals: z.array(z.string().max(160)).max(4).default([]),
  pages: z
    .array(z.object({ file: z.string().min(1), from: z.number().int().positive(), to: z.number().int().positive() }))
    .min(1),
  sections: z
    .array(z.object({ id: z.string().min(1).max(60), title: z.string().trim().min(1).max(160), kind: sectionKindSchema, blocks: z.array(z.string()) }))
    .min(1)
    .max(12),
});

const pageRangeSchema = z.object({ file: z.string().min(1), from: z.number().int().positive(), to: z.number().int().positive() });

/** Plans stored before approach, why and goals existed still parse: those fields have defaults. */
export const coursePlanSchema: z.ZodType<CoursePlan> = z.object({
  course: courseSchema,
  lectures: z.array(plannedLectureSchema).min(1),
  exam: z.object({ title: z.string().trim().min(1).max(160), intro: z.string().max(600) }).optional(),
  approach: z.enum(APPROACHES).default("follow-source"),
  why: z.string().max(300).default(""),
});

export const designOutlineSchema: z.ZodType<DesignOutline> = z.object({
  id: z.enum(["alt-1", "alt-2"]),
  approach: z.enum(APPROACHES),
  why: z.string().max(300),
  lectures: z
    .array(z.object({ slug: z.string().min(1).max(80), title: z.string().trim().min(1).max(160), summary: z.string().max(600), pages: z.array(pageRangeSchema).min(1) }))
    .min(1)
    .max(LIMITS.lectures),
});

export const courseDesignSchema: z.ZodType<CourseDesign> = z.object({
  recommended: coursePlanSchema,
  alternatives: z.array(designOutlineSchema).max(2),
});

export const PLAN_MAX_OUTPUT_TOKENS = 8_192;

/** Lower-case slug: letters, digits and dashes. */
export function slugify(value: string, fallback: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}

function sectionId(value: string, fallback: string): string {
  const id = value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "").slice(0, 50);
  return id || fallback;
}

function strings(value: unknown, count: number, length: number): string[] {
  return (Array.isArray(value) ? value : []).filter((item): item is string => typeof item === "string" && item.trim() !== "").slice(0, count).map((item) => item.trim().slice(0, length));
}

/** The model's home page, cut to the schema's limits; null when there is nothing usable. */
function cleanHome(raw: unknown): Course["home"] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const intro = typeof value.intro === "string" ? value.intro.trim().slice(0, 1200) : "";
  const highlights = (Array.isArray(value.highlights) ? value.highlights : [])
    .filter((item): item is { title: string; md: string } => !!item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string" && typeof (item as { md?: unknown }).md === "string")
    .slice(0, 4)
    .map((item) => ({ title: item.title.trim().slice(0, 80), md: item.md.trim().slice(0, 400) }));
  const studyPath = strings(value.studyPath, 6, 160);
  if (!intro && highlights.length === 0 && studyPath.length === 0) return null;
  return { ...(intro ? { intro } : {}), ...(highlights.length ? { highlights } : {}), ...(studyPath.length ? { studyPath } : {}) };
}

/** Fill fields the brief decides before validation, so the model cannot override them. */
function prepare(raw: unknown, brief: Brief): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const value = { ...(raw as Record<string, unknown>) };
  const course = value.course && typeof value.course === "object" ? { ...(value.course as Record<string, unknown>) } : {};
  course.indexable = false;
  course.language = brief.language;
  course.level = brief.level;
  if (brief.title) course.title = brief.title;
  if (typeof course.title === "string" && typeof course.shortTitle !== "string") course.shortTitle = course.title.slice(0, 16);
  if (typeof course.shortTitle === "string" && course.shortTitle.length > 24) course.shortTitle = course.shortTitle.slice(0, 24);
  course.id = slugify(typeof course.id === "string" ? course.id : typeof course.title === "string" ? course.title : "", "course");
  if (brief.accent) course.theme = { ...(typeof course.theme === "object" && course.theme ? course.theme : {}), accent: brief.accent };
  if (!Array.isArray(course.domains)) course.domains = ["core"];
  for (const key of ["overviewBadge", "overviewTitle", "overviewMd", "footerText", "examDate", "features"]) delete course[key];
  const home = cleanHome(course.home);
  if (home) course.home = home;
  else delete course.home;
  value.course = course;
  value.approach = (APPROACHES as readonly string[]).includes(value.approach as string) ? value.approach : "follow-source";
  value.why = typeof value.why === "string" ? value.why.trim().slice(0, 300) : "";
  if (Array.isArray(value.lectures)) {
    value.lectures = value.lectures.map((lecture) =>
      lecture && typeof lecture === "object"
        ? { ...(lecture as Record<string, unknown>), goals: strings((lecture as Record<string, unknown>).goals, 4, 160) }
        : lecture,
    );
  }
  if (!brief.examMode) delete value.exam;
  return value;
}

/** Number lectures from `start + 1`, make slugs unique (also against `taken`) and section ids unique per lecture. */
export function finishLectures(lectures: PlannedLecture[], start = 0, taken: Iterable<string> = []): PlannedLecture[] {
  const seen = new Set<string>(taken);
  return lectures.map((lecture, index) => {
    const number = start + index + 1;
    let slug = slugify(lecture.slug, `lecture-${number}`);
    if (seen.has(slug)) {
      let suffix = 2;
      while (seen.has(`${slug}-${suffix}`)) suffix += 1;
      slug = `${slug}-${suffix}`;
    }
    seen.add(slug);
    const sectionIds = new Set<string>();
    const sections = lecture.sections.map((section, sectionIndex) => {
      let id = sectionId(section.id, `section-${sectionIndex + 1}`);
      while (sectionIds.has(id)) id = `${id}-${sectionIndex + 1}`;
      sectionIds.add(id);
      return { ...section, id };
    });
    return { ...lecture, number, slug, sections };
  });
}

function finish(plan: CoursePlan, brief: Brief): CoursePlan {
  const lectures = finishLectures(plan.lectures.slice(0, LIMITS.lectures));
  const exam = brief.examMode ? (plan.exam ?? { title: "Exam training", intro: "Practise with questions from every lecture." }) : undefined;
  return { course: { ...plan.course, indexable: false }, lectures, ...(exam ? { exam } : {}), approach: plan.approach, why: plan.why };
}

function issues(error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

function titlesKey(titles: string[]): string {
  return titles.map((title) => title.trim().toLowerCase()).join("\n");
}

/**
 * The alternatives worth showing: valid shape, known files, an approach different from the recommendation
 * and from each other, and different lecture titles. At most two, as alt-1 and alt-2. Never throws.
 */
export function keepAlternatives(recommended: CoursePlan, raw: unknown, fileNames: string[]): DesignOutline[] {
  if (!Array.isArray(raw)) return [];
  const files = new Set(fileNames);
  const shape = z.object({
    approach: z.enum(APPROACHES),
    why: z.string().max(300).default(""),
    lectures: z
      .array(z.object({ title: z.string().trim().min(1).max(160), summary: z.string().trim().min(1).max(600), pages: z.array(pageRangeSchema).min(1) }))
      .min(1)
      .max(LIMITS.lectures),
  });
  const usedApproaches = new Set<string>([recommended.approach]);
  const recommendedTitles = titlesKey(recommended.lectures.map((lecture) => lecture.title));
  const kept: DesignOutline[] = [];
  for (const entry of raw) {
    if (kept.length === 2) break;
    const parsed = shape.safeParse(entry);
    if (!parsed.success) continue;
    const candidate = parsed.data;
    if (!candidate.lectures.every((lecture) => lecture.pages.some((range) => files.has(range.file)))) continue;
    if (usedApproaches.has(candidate.approach)) continue;
    if (titlesKey(candidate.lectures.map((lecture) => lecture.title)) === recommendedTitles) continue;
    usedApproaches.add(candidate.approach);
    const slugs = new Set<string>();
    kept.push({
      id: kept.length === 0 ? "alt-1" : "alt-2",
      approach: candidate.approach,
      why: candidate.why,
      lectures: candidate.lectures.map((lecture, index) => {
        let slug = slugify(lecture.title, `lecture-${index + 1}`);
        if (slugs.has(slug)) {
          let suffix = 2;
          while (slugs.has(`${slug}-${suffix}`)) suffix += 1;
          slug = `${slug}-${suffix}`;
        }
        slugs.add(slug);
        return { slug, title: lecture.title, summary: lecture.summary, pages: lecture.pages.filter((range) => files.has(range.file)) };
      }),
    });
  }
  return kept;
}

async function askPlan(
  prompt: { system: string; user: string },
  model: ModelClient,
  accept: (raw: unknown) => { plan: CoursePlan; raw: unknown } | { problems: string[] },
): Promise<{ plan: CoursePlan; raw: unknown }> {
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\nYOUR PREVIOUS REPLY WAS INVALID. PROBLEMS:\n${problems.map((line) => `- ${line}`).join("\n")}\nReply again with the full, corrected JSON.`;
    const reply = await model.complete({ system: prompt.system, user, maxOutputTokens: PLAN_MAX_OUTPUT_TOKENS });
    let raw: unknown;
    try {
      raw = extractJson(reply.text);
    } catch {
      problems = ["The reply was not JSON."];
      continue;
    }
    const result = accept(raw);
    if ("plan" in result) return result;
    problems = result.problems;
  }
  throw new Error(`The course plan was invalid twice: ${problems.slice(0, 3).join("; ")}`);
}

/** The recommended course plan and up to two real alternatives (outlines). */
export async function designCourse(materials: Material[], brief: Brief, context: CourseContext, model: ModelClient): Promise<CourseDesign> {
  const prompt = designPrompt(renderMaterials(materials), brief, context, LIMITS.lectures);
  const { plan, raw } = await askPlan(prompt, model, (value) => {
    const parsed = coursePlanSchema.safeParse(prepare(value, brief));
    return parsed.success ? { plan: finish(parsed.data, brief), raw: value } : { problems: issues(parsed.error) };
  });
  const alternatives = raw && typeof raw === "object" ? (raw as Record<string, unknown>).alternatives : undefined;
  return { recommended: plan, alternatives: keepAlternatives(plan, alternatives, materials.map((material) => material.name)) };
}

/** The full plan for a chosen alternative. The outline's lectures, titles and pages always win. */
export async function expandOutline(materials: Material[], brief: Brief, context: CourseContext, outline: DesignOutline, model: ModelClient): Promise<CoursePlan> {
  const fixed = outline.lectures.map((lecture) => ({ title: lecture.title, pages: lecture.pages.map((range) => `${range.file} p${range.from}-${range.to}`).join("; ") }));
  const prompt = designPrompt(renderMaterials(materials), brief, context, outline.lectures.length, fixed);
  const { plan } = await askPlan(prompt, model, (value) => {
    const parsed = coursePlanSchema.safeParse(prepare(value, brief));
    if (!parsed.success) return { problems: issues(parsed.error) };
    if (parsed.data.lectures.length !== outline.lectures.length) {
      return { problems: [`Return exactly ${outline.lectures.length} lectures, the ones listed under LECTURES ARE FIXED.`] };
    }
    const lectures = parsed.data.lectures.map((lecture, index) => {
      const fixedLecture = outline.lectures[index];
      return { ...lecture, number: index + 1, slug: fixedLecture.slug, title: fixedLecture.title, summary: fixedLecture.summary, pages: fixedLecture.pages };
    });
    return { plan: finish({ ...parsed.data, lectures, approach: outline.approach, why: outline.why }, brief), raw: value };
  });
  return plan;
}

/** The recommended plan only (older callers and the CLI). */
export async function planCourse(materials: Material[], brief: Brief, model: ModelClient): Promise<CoursePlan> {
  return (await designCourse(materials, brief, defaultContext(brief, brief.title ?? ""), model)).recommended;
}
