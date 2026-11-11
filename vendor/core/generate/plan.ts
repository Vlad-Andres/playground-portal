import { z } from "zod";
import { courseSchema, sectionKindSchema, type Course, type SectionKind } from "../schema";
import { renderMaterials } from "./ingest";
import { extractJson, type ModelClient } from "./model";
import { planPrompt } from "./prompts";
import { LIMITS, type Brief, type Material } from "./types";

export interface PlannedLecture {
  number: number;
  slug: string;
  title: string;
  summary: string;
  pages: { file: string; from: number; to: number }[];
  sections: { id: string; title: string; kind: SectionKind; blocks: string[] }[];
}

export interface CoursePlan {
  course: Course;
  lectures: PlannedLecture[];
  exam?: { title: string; intro: string };
}

const plannedLectureSchema = z.object({
  number: z.number().int().nonnegative(),
  slug: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  summary: z.string().max(600),
  pages: z
    .array(z.object({ file: z.string().min(1), from: z.number().int().positive(), to: z.number().int().positive() }))
    .min(1),
  sections: z
    .array(z.object({ id: z.string().min(1).max(60), title: z.string().trim().min(1).max(160), kind: sectionKindSchema, blocks: z.array(z.string()) }))
    .min(1)
    .max(12),
});

export const coursePlanSchema: z.ZodType<CoursePlan> = z.object({
  course: courseSchema,
  lectures: z.array(plannedLectureSchema).min(1),
  exam: z.object({ title: z.string().trim().min(1).max(160), intro: z.string().max(600) }).optional(),
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
  value.course = course;
  if (!brief.examMode) delete value.exam;
  return value;
}

function finish(plan: CoursePlan, brief: Brief): CoursePlan {
  const seen = new Set<string>();
  const lectures = plan.lectures.slice(0, LIMITS.lectures).map((lecture, index) => {
    const number = index + 1;
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
  const exam = brief.examMode ? (plan.exam ?? { title: "Exam training", intro: "Practise with questions from every lecture." }) : undefined;
  return { course: { ...plan.course, indexable: false }, lectures, ...(exam ? { exam } : {}) };
}

function issues(error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

export async function planCourse(materials: Material[], brief: Brief, model: ModelClient): Promise<CoursePlan> {
  const prompt = planPrompt(renderMaterials(materials), brief, LIMITS.lectures);
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
    const parsed = coursePlanSchema.safeParse(prepare(raw, brief));
    if (parsed.success) return finish(parsed.data, brief);
    problems = issues(parsed.error);
  }
  throw new Error(`The course plan was invalid twice: ${problems.slice(0, 3).join("; ")}`);
}
