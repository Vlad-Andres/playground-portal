import { z } from "zod";
import { decideLanguage, detectLanguage } from "./language";
import { renderMaterials } from "./ingest";
import { BudgetExceeded, extractJson, type ModelClient } from "./model";
import { contextPrompt, languageName } from "./prompts";
import { LEVELS, LIMITS, type Brief, type CourseRequest, type Material } from "./types";

export interface ContextQuestion {
  id: "language" | "focus";
  options: { id: string; label: string }[];
}

export interface CourseContext {
  /** null only while the "language" question is open. */
  language: string | null;
  languageSource: "user" | "material" | "portal" | null;
  level: (typeof LEVELS)[number];
  subject: string;
  goals: string[];
  assumptions: string[];
  questions: ContextQuestion[];
}

const optionSchema = z.object({ id: z.string(), label: z.string() }).strict();
export const courseContextSchema: z.ZodType<CourseContext> = z
  .object({
    language: z.string().nullable(),
    languageSource: z.enum(["user", "material", "portal"]).nullable(),
    level: z.enum(LEVELS),
    subject: z.string().max(120),
    goals: z.array(z.string().max(160)).max(5),
    assumptions: z.array(z.string().max(200)).max(4),
    questions: z.array(z.object({ id: z.enum(["language", "focus"]), options: z.array(optionSchema) }).strict()).max(2),
  })
  .strict();

export const CONTEXT_SAMPLE_CHARACTERS = 12_000;
const CONTEXT_MAX_OUTPUT_TOKENS = 1_024;

/** The first two pages of every file, as the model sees material, cut to CONTEXT_SAMPLE_CHARACTERS. */
export function sampleMaterials(materials: Material[]): string {
  const ranges = materials.map((material) => ({ file: material.name, from: 1, to: Math.max(...material.pages.slice(0, 2).map((page) => page.n), 1) }));
  return renderMaterials(materials, ranges).slice(0, CONTEXT_SAMPLE_CHARACTERS);
}

const replySchema = z.object({
  subject: z.string().trim().min(1),
  level: z.string().optional(),
  goals: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  focus: z.unknown().optional(),
});

function cut(list: string[] | undefined, count: number, length: number): string[] {
  return (list ?? []).map((item) => item.trim()).filter(Boolean).slice(0, count).map((item) => item.slice(0, length));
}

/** A focus question survives only with 2–4 options, unique simple ids and labels of 1–80 characters. */
function focusQuestion(raw: unknown): ContextQuestion | null {
  const parsed = z.object({ options: z.array(optionSchema).min(2).max(4) }).safeParse(raw);
  if (!parsed.success) return null;
  const { options } = parsed.data;
  if (new Set(options.map((option) => option.id)).size !== options.length) return null;
  if (!options.every((option) => /^[a-z0-9-]{1,20}$/.test(option.id) && option.label.trim().length >= 1 && option.label.length <= 80)) return null;
  return { id: "focus", options: options.map((option) => ({ id: option.id, label: option.label.trim() })) };
}

function fileStem(materials: Material[]): string {
  return (materials[0]?.name ?? "Course").replace(/\.[^.]+$/, "").slice(0, 120);
}

/**
 * What the course is about and in which language, with at most two questions. Code decides the language
 * and whether to ask; one model call (plus one retry) proposes subject, level, goals and a possible focus.
 */
export async function inferContext(materials: Material[], request: CourseRequest, model: ModelClient): Promise<CourseContext> {
  const decision = decideLanguage({ requested: request.language, locale: request.locale, guess: detectLanguage(materials) });
  const questions: ContextQuestion[] = [];
  let language: string | null = null;
  let languageSource: CourseContext["languageSource"] = null;
  if ("ask" in decision) questions.push({ id: "language", options: decision.ask.map((code) => ({ id: code, label: languageName(code) })) });
  else ({ language, source: languageSource } = decision);

  const levelFrom = (value: unknown): CourseContext["level"] =>
    request.level !== "auto" ? request.level : (LEVELS as readonly string[]).includes(value as string) ? (value as CourseContext["level"]) : "university";

  const prompt = contextPrompt({ sample: sampleMaterials(materials), note: request.context, locale: request.locale });
  let problems = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user = attempt === 0 ? prompt.user : `${prompt.user}\n\nYOUR PREVIOUS REPLY WAS INVALID: ${problems}\nReply again with the full, corrected JSON.`;
    let raw: unknown;
    try {
      raw = extractJson((await model.complete({ system: prompt.system, user, maxOutputTokens: CONTEXT_MAX_OUTPUT_TOKENS })).text);
    } catch (error) {
      if (error instanceof BudgetExceeded) throw error;
      problems = "The reply was not JSON.";
      continue;
    }
    const parsed = replySchema.safeParse(raw);
    if (!parsed.success) {
      problems = parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
      continue;
    }
    const focus = request.context.trim() === "" ? focusQuestion(parsed.data.focus) : null;
    return {
      language,
      languageSource,
      level: levelFrom(parsed.data.level),
      subject: parsed.data.subject.slice(0, 120),
      goals: cut(parsed.data.goals, 5, 160),
      assumptions: cut(parsed.data.assumptions, 4, 200),
      questions: focus ? [...questions, focus] : questions,
    };
  }
  return { language, languageSource, level: levelFrom(undefined), subject: fileStem(materials), goals: [], assumptions: [], questions };
}

/** The generator's brief: the request's options, the context's language and level. */
export function resolveBrief(request: CourseRequest, context: CourseContext): Brief {
  if (context.language === null) throw new Error("The course language is still open.");
  return {
    language: context.language,
    level: context.level,
    depth: request.depth,
    examMode: request.examMode,
    quizzes: request.quizzes,
    widgets: request.widgets,
    ...(request.title ? { title: request.title } : {}),
    ...(request.accent ? { accent: request.accent } : {}),
    context: request.context,
  };
}

/** Apply the person's answers. Every open question needs a valid answer; "skip" is allowed for focus. */
export function answerContext(
  context: CourseContext,
  request: CourseRequest,
  answers: Record<string, string>,
): { ok: true; context: CourseContext; brief: Brief } | { ok: false } {
  let next: CourseContext = { ...context, questions: [] };
  let note = request.context;
  for (const question of context.questions) {
    const answer = answers[question.id];
    if (typeof answer !== "string") return { ok: false };
    if (question.id === "language") {
      if (!question.options.some((option) => option.id === answer)) return { ok: false };
      next = { ...next, language: answer, languageSource: "user" };
    } else if (answer !== "skip") {
      const option = question.options.find((item) => item.id === answer);
      if (!option) return { ok: false };
      const line = `Focus chosen by the learner: ${option.label}`;
      note = (note.trim() ? `${note}\n${line}` : line).slice(0, LIMITS.contextCharacters);
    }
  }
  return { ok: true, context: next, brief: resolveBrief({ ...request, context: note }, next) };
}

/** A context for briefs that already decided everything (older jobs, refinements). */
export function defaultContext(brief: Brief, subject: string): CourseContext {
  return { language: brief.language, languageSource: "user", level: brief.level, subject, goals: [], assumptions: [], questions: [] };
}
