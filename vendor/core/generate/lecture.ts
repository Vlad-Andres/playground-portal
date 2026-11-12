import { z } from "zod";
import {
  conceptSchema,
  lectureFileSchema,
  lectureMetaSchema,
  quizQuestionSchema,
  sectionKindSchema,
  type Block,
  type Concept,
  type LectureFile,
  type LectureMeta,
  type QuizQuestion,
  type SectionKind,
} from "../schema";
import { formatProblem, schemaProblems, validateBlock, type Problem } from "../validate";
import { generatorWidgetTypes } from "../widgets";
import { renderMaterials } from "./ingest";
import { lintLecture } from "./lint";
import { extractJson, type ModelClient } from "./model";
import type { CoursePlan, PlannedLecture } from "./plan";
import { DEPTH_TARGETS, improvePrompt, lecturePrompt, refineLecturePrompt, repairPrompt } from "./prompts";
import type { Brief, Material } from "./types";

export const LECTURE_MAX_OUTPUT_TOKENS = 24_000;
export const REPAIR_MAX_OUTPUT_TOKENS = 8_000;
export const IMPROVE_MAX_OUTPUT_TOKENS = 8_000;

type Kind = "meta" | "concept" | "quiz" | "block";

interface Item {
  kind: Kind;
  /** Where the item sits, e.g. "concepts[2]" or "sections[1].blocks[3]". */
  path: string;
  label: string;
  value: unknown;
  problems: Problem[];
}

interface WorkingSection {
  id: string;
  title: string;
  kind: SectionKind;
  blocks: { path: string; value: unknown }[];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function sectionId(value: unknown, fallback: string): string {
  const id = typeof value === "string" ? value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "").slice(0, 50) : "";
  return id || fallback;
}

function zodProblems(schema: z.ZodType, value: unknown): Problem[] {
  const result = schema.safeParse(value);
  return result.success ? [] : schemaProblems("", result.error.issues);
}

function quizProblems(value: unknown): Problem[] {
  const problems = zodProblems(quizQuestionSchema, value);
  if (problems.length) return problems;
  const question = value as QuizQuestion;
  const ids = question.options.map((option) => option.id);
  if (!ids.includes(question.answerId)) {
    problems.push({ code: "E103", severity: "error", file: "", path: "answerId", message: `Answer "${question.answerId}" is not one of the question's options.`, fix: "Set answerId to the id of one of this question's options." });
  }
  if (new Set(ids).size !== ids.length) {
    problems.push({ code: "E101", severity: "error", file: "", path: "options", message: "Option ids must be unique.", fix: "Give every option its own id." });
  }
  return problems;
}

/** How many model-written custom exercises this lecture may keep: only where the plan asked for one. */
export function customLimit(brief: Brief, planned: PlannedLecture): number {
  if (!brief.widgets) return 0;
  if (!planned.sections.some((section) => section.blocks.includes("custom"))) return 0;
  return DEPTH_TARGETS[brief.depth].custom;
}

const NOT_PLANNED: Problem = { code: "W309", severity: "error", file: "", path: "kind", message: "A custom exercise is not planned here.", fix: "Use a catalogue widget or another block kind." };

function blockProblems(value: unknown, brief: Brief, allowCustom = 0): Problem[] {
  const problems = validateBlock(value);
  if (problems.length) return problems;
  const block = value as Block;
  if (block.kind === "custom" && allowCustom <= 0) return [NOT_PLANNED];
  if (block.kind === "widget" && (!brief.widgets || !(generatorWidgetTypes as string[]).includes(block.type) || block.type === "mock-exam")) {
    return [{ code: "E104", severity: "error", file: "", path: "type", message: `Widget "${block.type}" is not available here.`, fix: `Use one of: ${generatorWidgetTypes.filter((type) => type !== "mock-exam").join(", ")}, or another block kind.` }];
  }
  return [];
}

function check(item: Omit<Item, "problems">, brief: Brief, allowCustom = 0): Item {
  const problems =
    item.kind === "meta"
      ? zodProblems(lectureMetaSchema, item.value)
      : item.kind === "concept"
        ? zodProblems(conceptSchema, item.value)
        : item.kind === "quiz"
          ? quizProblems(item.value)
          : blockProblems(item.value, brief, allowCustom);
  return { ...item, problems };
}

function fallbackMeta(planned: PlannedLecture, plan: CoursePlan, materials: Material[]): LectureMeta {
  const files = [...new Set(planned.pages.map((range) => range.file))].filter((file) => materials.some((material) => material.name === file));
  return {
    slug: planned.slug,
    number: planned.number,
    title: planned.title,
    subtitle: plan.course.title,
    summary: planned.summary,
    topics: [],
    difficulty: "core",
    estimatedMinutes: 30,
    sources: files.map((file) => ({ label: file, kind: "notes" as const, detail: file })),
    objectives: [],
    takeaways: [],
  };
}

function forceMeta(value: unknown, planned: PlannedLecture): unknown {
  return { ...asObject(value), number: planned.number, slug: planned.slug, title: planned.title };
}

async function askJson(model: ModelClient, system: string, user: string, maxOutputTokens: number): Promise<unknown | undefined> {
  const reply = await model.complete({ system, user, maxOutputTokens });
  try {
    return extractJson(reply.text);
  } catch {
    return undefined;
  }
}

function dropProblem(item: Item): Problem {
  const first = item.problems[0];
  return {
    code: first?.code ?? "E003",
    severity: "error",
    file: "",
    path: item.path,
    message: `Dropped ${item.label}: ${item.problems.map((problem) => `${problem.path ? `${problem.path}: ` : ""}${problem.message}`).join("; ")}`,
    fix: first?.fix ?? "",
  };
}

interface ReplyContext {
  brief: Brief;
  model: ModelClient;
  allowCustom: number;
  /** Titles and kinds to fall back on, per section index. */
  sectionHints: { title?: string; kind?: SectionKind }[];
  forceMeta: (value: unknown) => unknown;
  fallbackMeta: () => LectureMeta;
}

/** Validate every part of a lecture reply, send the invalid ones to one repair call, drop what still fails, assemble. */
async function validateReply(reply: Record<string, unknown>, ctx: ReplyContext): Promise<{ lecture: LectureFile; dropped: Problem[] }> {
  // 2. Validate every part separately.
  const sections: WorkingSection[] = asArray(reply.sections).map((value, sectionIndex) => {
    const section = asObject(value);
    const kind = sectionKindSchema.safeParse(section.kind);
    return {
      id: sectionId(section.id, `section-${sectionIndex + 1}`),
      title: typeof section.title === "string" && section.title.trim() ? section.title.trim() : ctx.sectionHints[sectionIndex]?.title ?? `Section ${sectionIndex + 1}`,
      kind: kind.success ? kind.data : (ctx.sectionHints[sectionIndex]?.kind ?? "concepts"),
      blocks: asArray(section.blocks)
        .map((block, blockIndex) => ({ path: `sections[${sectionIndex}].blocks[${blockIndex}]`, value: block }))
        .filter(({ value: block }) => ctx.brief.widgets || asObject(block).kind !== "widget"),
    };
  });

  const items: Item[] = [
    check({ kind: "meta", path: "meta", label: "lecture meta", value: ctx.forceMeta(reply.meta) }, ctx.brief),
    ...asArray(reply.concepts).map((value, i) => check({ kind: "concept", path: `concepts[${i}]`, label: "concept", value }, ctx.brief)),
    ...(ctx.brief.quizzes ? asArray(reply.quiz) : []).map((value, i) => check({ kind: "quiz", path: `quiz[${i}]`, label: "quiz question", value }, ctx.brief)),
    ...sections.flatMap((section) =>
      section.blocks.map(({ path, value }) => check({ kind: "block", path, label: `block in section "${section.id}"`, value }, ctx.brief, ctx.allowCustom)),
    ),
  ];

  // 3. One repair call for everything invalid; what still fails is dropped.
  const invalid = items.filter((item) => item.problems.length > 0);
  if (invalid.length > 0) {
    const repair = repairPrompt(
      invalid.map((item) => ({ label: item.label, value: item.value, problems: item.problems.map((problem) => formatProblem(problem).trim()) })),
      ctx.brief.widgets,
    );
    const repaired = asArray(asObject(await askJson(ctx.model, repair.system, repair.user, REPAIR_MAX_OUTPUT_TOKENS)).items);
    invalid.forEach((item, i) => {
      const value = repaired[i];
      if (value === null || value === undefined) return;
      const next = check({ ...item, value: item.kind === "meta" ? ctx.forceMeta(value) : value }, ctx.brief, ctx.allowCustom);
      if (next.problems.length === 0) {
        item.value = next.value;
        item.problems = [];
      } else {
        item.problems = next.problems;
      }
    });
  }

  const dropped: Problem[] = [];
  const valid = (kind: Kind) =>
    items.filter((item) => {
      if (item.kind !== kind) return false;
      if (item.problems.length > 0) {
        dropped.push(dropProblem(item));
        return false;
      }
      return true;
    });

  const metaItem = items[0];
  const meta = metaItem.problems.length === 0 ? (metaItem.value as LectureMeta) : ctx.fallbackMeta();
  if (metaItem.problems.length > 0) dropped.push(dropProblem({ ...metaItem, label: "lecture meta (replaced from the plan)" }));

  const concepts: Concept[] = [];
  for (const item of valid("concept")) {
    const concept = item.value as Concept;
    if (concepts.some((existing) => existing.id === concept.id)) dropped.push(dropProblem({ ...item, problems: [{ code: "E101", severity: "error", file: "", path: "id", message: `Duplicate concept id "${concept.id}".`, fix: "" }] }));
    else concepts.push(concept);
  }
  const quiz: QuizQuestion[] = [];
  for (const item of valid("quiz")) {
    const question = item.value as QuizQuestion;
    if (quiz.some((existing) => existing.id === question.id)) dropped.push(dropProblem({ ...item, problems: [{ code: "E101", severity: "error", file: "", path: "id", message: `Duplicate quiz id "${question.id}".`, fix: "" }] }));
    else quiz.push(question);
  }
  // Keep at most `allowCustom` custom exercises; any beyond that are dropped, never published.
  let customKept = 0;
  const blockItems = valid("block").filter((item) => {
    if ((item.value as Block).kind !== "custom") return true;
    customKept += 1;
    if (customKept <= ctx.allowCustom) return true;
    dropped.push(dropProblem({ ...item, problems: [{ ...NOT_PLANNED, message: `More than ${ctx.allowCustom} custom exercise(s) in this lecture.` }] }));
    return false;
  });
  const validBlocks = new Map(blockItems.map((item) => [item.path, item.value as Block]));

  // 4. Clean up references and empty sections.
  return { dropped, lecture: assemble(meta, concepts, quiz, sections.map((section) => ({ ...section, blocks: section.blocks.flatMap(({ path }) => (validBlocks.has(path) ? [validBlocks.get(path) as Block] : [])) }))) };
}

export async function writeLecture(
  plan: CoursePlan,
  index: number,
  materials: Material[],
  brief: Brief,
  model: ModelClient,
): Promise<{ lecture: LectureFile; dropped: Problem[] }> {
  const planned = plan.lectures[index];
  if (!planned) throw new Error(`The plan has no lecture ${index + 1}.`);
  const pagesText = renderMaterials(materials, planned.pages);
  const pageCount = (pagesText.match(/^=== .+ — page \d+ ===$/gm) ?? []).length;
  const allowCustom = customLimit(brief, planned);
  const prompt = lecturePrompt({ brief, lecturePlan: planned, courseTitle: plan.course.title, pagesText, pageCount, customLimit: allowCustom });

  // 1. One main call, one retry when the reply is not JSON.
  let raw = await askJson(model, prompt.system, prompt.user, LECTURE_MAX_OUTPUT_TOKENS);
  if (raw === undefined) {
    raw = await askJson(model, prompt.system, `${prompt.user}\n\nYour previous reply was not valid JSON. Reply with the JSON object only.`, LECTURE_MAX_OUTPUT_TOKENS);
  }
  if (raw === undefined) throw new Error("The lecture reply was not JSON twice.");

  const { lecture, dropped } = await validateReply(asObject(raw), {
    brief,
    model,
    allowCustom,
    sectionHints: planned.sections,
    forceMeta: (value) => forceMeta(value, planned),
    fallbackMeta: () => fallbackMeta(planned, plan, materials),
  });

  // 5. One improvement call when the lecture misses its targets.
  const warnings = lintLecture(lecture, brief, pageCount);
  if (warnings.length === 0) return { lecture, dropped };
  const improve = improvePrompt({
    brief,
    warnings: warnings.map((warning) => `${warning.code}: ${warning.message} ${warning.fix}`),
    sectionIds: lecture.sections.map((section) => section.id),
    conceptIds: lecture.concepts.map((concept) => concept.id),
    quizIds: lecture.quiz.map((question) => question.id),
    pagesText,
  });
  const additions = asObject(await askJson(model, improve.system, improve.user, IMPROVE_MAX_OUTPUT_TOKENS));
  return { lecture: applyAdditions(lecture, additions, brief), dropped };
}

function assemble(meta: LectureMeta, concepts: Concept[], quiz: QuizQuestion[], sections: { id: string; title: string; kind: SectionKind; blocks: Block[] }[]): LectureFile {
  const conceptIds = new Set(concepts.map((concept) => concept.id));
  const seen = new Set<string>();
  const cleaned = sections
    .map((section) => ({
      ...section,
      blocks: section.blocks
        .map((block) => (block.kind === "concepts" ? { ...block, ids: block.ids.filter((id) => conceptIds.has(id)) } : block))
        .filter((block) => block.kind !== "concepts" || block.ids.length > 0),
    }))
    .filter((section) => section.blocks.length > 0)
    .map((section, index) => {
      let id = section.id;
      while (seen.has(id)) id = `${section.id}-${index + 1}`;
      seen.add(id);
      return { ...section, id };
    });
  if (cleaned.length === 0) throw new Error("lecture produced no valid content");
  const lecture = { meta, concepts, quiz, sections: cleaned };
  const parsed = lectureFileSchema.safeParse(lecture);
  if (!parsed.success) throw new Error(`Generated lecture failed the schema: ${parsed.error.issues[0]?.message}`);
  return parsed.data;
}

function applyAdditions(lecture: LectureFile, additions: Record<string, unknown>, brief: Brief): LectureFile {
  const concepts = [...lecture.concepts];
  for (const value of asArray(additions.concepts)) {
    if (zodProblems(conceptSchema, value).length) continue;
    const concept = value as Concept;
    if (!concepts.some((existing) => existing.id === concept.id)) concepts.push(concept);
  }
  const quiz = [...lecture.quiz];
  if (brief.quizzes) {
    for (const value of asArray(additions.quiz)) {
      if (quizProblems(value).length) continue;
      const question = value as QuizQuestion;
      if (!quiz.some((existing) => existing.id === question.id)) quiz.push(question);
    }
  }
  const sections = lecture.sections.map((section) => ({ ...section, blocks: [...section.blocks] }));
  for (const value of asArray(additions.blocks)) {
    const entry = asObject(value);
    if (blockProblems(entry.block, brief).length) continue;
    const target = sections.find((section) => section.id === entry.sectionId) ?? sections[sections.length - 1];
    target.blocks.push(entry.block as Block);
  }
  return assemble(lecture.meta, concepts, quiz, sections);
}

/**
 * Rewrite one existing lecture following one instruction. Number and slug never change. A reply that is not
 * JSON twice, or leaves nothing valid, returns the lecture unchanged instead of failing.
 */
export async function rewriteLecture(
  existing: LectureFile,
  instruction: string,
  pagesText: string | null,
  brief: Brief,
  model: ModelClient,
): Promise<{ lecture: LectureFile; changed: boolean }> {
  const prompt = refineLecturePrompt({ brief, lecture: existing, instruction, pagesText });
  let raw = await askJson(model, prompt.system, prompt.user, LECTURE_MAX_OUTPUT_TOKENS);
  if (raw === undefined) {
    raw = await askJson(model, prompt.system, `${prompt.user}\n\nYour previous reply was not valid JSON. Reply with the JSON object only.`, LECTURE_MAX_OUTPUT_TOKENS);
  }
  if (raw === undefined) return { lecture: existing, changed: false };
  const keep = (value: unknown) => ({ ...asObject(value), number: existing.meta.number, slug: existing.meta.slug });
  // Custom exercises already in the lecture may stay; the rewrite may not add more.
  const allowCustom = existing.sections.flatMap((section) => section.blocks).filter((block) => block.kind === "custom").length;
  try {
    const { lecture } = await validateReply(asObject(raw), {
      brief,
      model,
      allowCustom,
      sectionHints: existing.sections,
      forceMeta: keep,
      fallbackMeta: () => existing.meta,
    });
    return { lecture, changed: JSON.stringify(lecture) !== JSON.stringify(existing) };
  } catch {
    return { lecture: existing, changed: false };
  }
}
