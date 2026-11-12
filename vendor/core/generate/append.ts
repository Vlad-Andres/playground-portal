import { z } from "zod";
import type { SiteData } from "../site";
import { renderMaterials } from "./ingest";
import { extractJson, type ModelClient } from "./model";
import { finishLectures, plannedLectureSchema, type PlannedLecture } from "./plan";
import { appendPlanPrompt } from "./prompts";
import { LIMITS, type Brief, type Material } from "./types";

export interface AppendPlan {
  lectures: PlannedLecture[];
  /** Only when two or more existing lectures would change; the owner then chooses. */
  restructure: { affected: string[]; reason: string } | null;
}

export const appendPlanSchema: z.ZodType<AppendPlan> = z.object({
  lectures: z.array(plannedLectureSchema),
  restructure: z.object({ affected: z.array(z.string()).min(2), reason: z.string().max(300) }).nullable(),
});

const APPEND_PLAN_MAX_OUTPUT_TOKENS = 8_192;

function goalsCut(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const value = raw as Record<string, unknown>;
  const goals = Array.isArray(value.goals) ? value.goals.filter((goal): goal is string => typeof goal === "string").slice(0, 4).map((goal) => goal.slice(0, 160)) : [];
  return { ...value, goals };
}

/** Lectures for new material, numbered after the existing ones, plus whether a reorganisation is worth offering. */
export async function planAppend(materials: Material[], brief: Brief, site: SiteData, model: ModelClient): Promise<AppendPlan> {
  const room = Math.max(0, LIMITS.courseLectures - site.lectures.length);
  const existing = site.lectures.map((lecture) => ({ slug: lecture.meta.slug, title: lecture.meta.title, summary: lecture.meta.summary, topics: lecture.meta.topics }));
  const slugs = new Set(existing.map((lecture) => lecture.slug));
  const prompt = appendPlanPrompt({ brief, existing, materialText: renderMaterials(materials), maxLectures: Math.min(room, LIMITS.lectures) });
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\nYOUR PREVIOUS REPLY WAS INVALID. PROBLEMS:\n${problems.map((line) => `- ${line}`).join("\n")}\nReply again with the full, corrected JSON.`;
    let raw: unknown;
    try {
      raw = extractJson((await model.complete({ system: prompt.system, user, maxOutputTokens: APPEND_PLAN_MAX_OUTPUT_TOKENS })).text);
    } catch {
      problems = ["The reply was not JSON."];
      continue;
    }
    const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const lectures = z.array(plannedLectureSchema).safeParse(Array.isArray(value.lectures) ? value.lectures.map(goalsCut) : value.lectures);
    if (!lectures.success) {
      problems = lectures.error.issues.slice(0, 10).map((issue) => `lectures.${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    const planned = finishLectures(lectures.data.slice(0, room), site.lectures.reduce((max, lecture) => Math.max(max, lecture.meta.number), 0), slugs);
    const proposal = value.restructure && typeof value.restructure === "object" ? (value.restructure as Record<string, unknown>) : {};
    const affected = [...new Set((Array.isArray(proposal.affected) ? proposal.affected : []).filter((slug): slug is string => typeof slug === "string" && slugs.has(slug)))];
    const restructure =
      proposal.recommended === true && affected.length >= 2
        ? { affected, reason: typeof proposal.reason === "string" ? proposal.reason.trim().slice(0, 300) : "" }
        : null;
    return { lectures: planned, restructure };
  }
  throw new Error(`The course plan was invalid twice: ${problems.slice(0, 3).join("; ")}`);
}
