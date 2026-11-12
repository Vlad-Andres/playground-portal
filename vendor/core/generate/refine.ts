import { z } from "zod";
import type { SiteData } from "../site";
import { extractJson, type ModelClient } from "./model";
import { refinePlanPrompt } from "./prompts";
import { LIMITS, type Brief } from "./types";

export interface RefinePlan {
  summary: string;
  course: { title?: string; description?: string };
  lectures: { slug: string; instruction: string }[];
}

export const refinePlanSchema: z.ZodType<RefinePlan> = z
  .object({
    summary: z.string().max(300),
    course: z.object({ title: z.string().trim().min(1).max(120).optional(), description: z.string().max(400).optional() }).strict(),
    lectures: z.array(z.object({ slug: z.string(), instruction: z.string().max(400) }).strict()).max(LIMITS.refineLectures),
  })
  .strict();

export interface LectureOutline {
  slug: string;
  title: string;
  summary: string;
  sections: { title: string; kinds: string[] }[];
}

/** What the model needs to know about a site to plan a refinement, without its full text. */
export function outlineOf(site: SiteData): LectureOutline[] {
  return site.lectures.map((lecture) => ({
    slug: lecture.meta.slug,
    title: lecture.meta.title,
    summary: lecture.meta.summary,
    sections: lecture.sections.map((section) => ({ title: section.title, kinds: [...new Set(section.blocks.map((block) => block.kind))] })),
  }));
}

const REFINE_PLAN_MAX_OUTPUT_TOKENS = 2_048;

function clean(raw: unknown, slugs: Set<string>): RefinePlan {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const course = value.course && typeof value.course === "object" ? (value.course as Record<string, unknown>) : {};
  const title = typeof course.title === "string" ? course.title.trim().slice(0, 120) : "";
  const description = typeof course.description === "string" ? course.description.trim().slice(0, 400) : undefined;
  const seen = new Set<string>();
  const lectures = (Array.isArray(value.lectures) ? value.lectures : [])
    .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}))
    .filter((entry) => typeof entry.slug === "string" && slugs.has(entry.slug) && typeof entry.instruction === "string" && entry.instruction.trim() !== "")
    .filter((entry) => !seen.has(entry.slug as string) && seen.add(entry.slug as string))
    .slice(0, LIMITS.refineLectures)
    .map((entry) => ({ slug: entry.slug as string, instruction: (entry.instruction as string).trim().slice(0, 400) }));
  return {
    summary: typeof value.summary === "string" ? value.summary.trim().slice(0, 300) : "",
    course: { ...(title ? { title } : {}), ...(description ? { description } : {}) },
    lectures,
  };
}

/** Turn the owner's note into at most three lecture instructions and optional title/description. Throws "refine-empty". */
export async function planRefinement(note: string, site: SiteData, brief: Brief, model: ModelClient): Promise<RefinePlan> {
  const prompt = refinePlanPrompt({
    title: site.course.title,
    description: site.course.description,
    outline: outlineOf(site),
    note: note.slice(0, LIMITS.refineNote),
    language: brief.language,
    maxLectures: LIMITS.refineLectures,
  });
  const slugs = new Set(site.lectures.map((lecture) => lecture.meta.slug));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\nYOUR PREVIOUS REPLY WAS EMPTY OR INVALID. Name at least one existing lecture slug, or a new title or description.`;
    let raw: unknown;
    try {
      raw = extractJson((await model.complete({ system: prompt.system, user, maxOutputTokens: REFINE_PLAN_MAX_OUTPUT_TOKENS })).text);
    } catch {
      continue;
    }
    const plan = clean(raw, slugs);
    if (plan.lectures.length > 0 || plan.course.title || plan.course.description !== undefined) return refinePlanSchema.parse(plan);
  }
  throw new Error("refine-empty");
}
