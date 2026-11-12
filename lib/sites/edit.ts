import { z } from "zod";
import { toIndexEntry } from "@core/assemble";
import type { Block } from "@core/schema";
import { siteDataSchema, type SiteData } from "@core/site";

export interface CoursePatch {
  title?: string;
  description?: string;
  accent?: string;
  lectures?: { slug: string; title?: string; remove?: boolean }[];
  blocks?: { slug: string; sectionId: string; index: number; remove?: boolean; md?: string }[];
}

const ACCENT_HEX = /^#[0-9a-fA-F]{6}$/;
const MD_MAX_CHARS = 6_000;

const lecturePatchSchema = z
  .object({
    slug: z.string().min(1),
    title: z.string().trim().min(1).max(120).optional(),
    remove: z.boolean().optional(),
  })
  .strict();

const blockPatchSchema = z
  .object({
    slug: z.string().min(1),
    sectionId: z.string().min(1),
    index: z.number().int().nonnegative(),
    remove: z.boolean().optional(),
    md: z.string().max(MD_MAX_CHARS).optional(),
  })
  .strict();

export const coursePatchSchema: z.ZodType<CoursePatch> = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(400).optional(),
    accent: z.string().regex(ACCENT_HEX).optional(),
    lectures: z.array(lecturePatchSchema).max(100).optional(),
    blocks: z.array(blockPatchSchema).max(200).optional(),
  })
  .strict();

export type PatchError =
  | "unknown-lecture"
  | "unknown-block"
  | "not-editable"
  | "last-lecture"
  | "empty-lecture"
  | "invalid";

function rawPreview(block: Block): string {
  switch (block.kind) {
    case "prose":
      return block.md;
    case "info":
      return block.title ? `${block.title} — ${block.md}` : block.md;
    case "concepts":
      return block.ids.join(", ");
    case "formula":
      return block.caption || block.tex;
    case "code":
      return block.caption || block.code;
    case "table":
      return block.caption || block.headers.join(" · ");
    case "figure":
      return block.caption || block.alt;
    case "steps":
      return block.title;
    case "timeline":
      return block.items[0]?.title ?? "";
    case "list":
      return block.items[0] ?? "";
    case "exercises":
      return block.sheet.title;
    case "recall":
      return block.cards[0]?.prompt ?? "";
    case "practice":
      return block.tasks[0]?.prompt ?? "";
    case "widget":
      return block.title;
    case "custom":
      return block.title;
  }
}

export function blockSummary(block: Block): { kind: string; text: string; editable: boolean } {
  const text = rawPreview(block).replace(/\s+/g, " ").trim().slice(0, 140);
  return {
    kind: block.kind,
    text,
    editable: block.kind === "prose" || block.kind === "info",
  };
}

export function applyCoursePatch(
  site: SiteData,
  patch: CoursePatch,
): { ok: true; site: SiteData } | { ok: false; code: PatchError } {
  const next = structuredClone(site);

  // 1. Course metadata
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (trimmed.length < 1 || trimmed.length > 120) return { ok: false, code: "invalid" };
    const oldTitle = next.course.title;
    next.course.title = trimmed;
    if (next.course.shortTitle === oldTitle) next.course.shortTitle = trimmed;
  }
  if (patch.description !== undefined) {
    if (patch.description.length > 400) return { ok: false, code: "invalid" };
    next.course.description = patch.description;
  }
  if (patch.accent !== undefined) {
    if (!ACCENT_HEX.test(patch.accent)) return { ok: false, code: "invalid" };
    next.course.theme = { ...next.course.theme, accent: patch.accent };
  }

  // 2. Lecture titles and removal set
  const removeLectures = new Set<string>();
  for (const entry of patch.lectures ?? []) {
    const lecture = next.lectures.find((item) => item.meta.slug === entry.slug);
    if (!lecture) return { ok: false, code: "unknown-lecture" };
    if (entry.title !== undefined) {
      const trimmed = entry.title.trim();
      if (trimmed.length < 1 || trimmed.length > 120) return { ok: false, code: "invalid" };
      lecture.meta.title = trimmed;
    }
    if (entry.remove === true) removeLectures.add(entry.slug);
  }

  // 3. Validate all block targets by original index, apply md changes first, then removals high-to-low
  const removalsBySection = new Map<string, { blocks: Block[]; indices: Set<number> }>();
  const mdUpdates: { target: Extract<Block, { kind: "prose" | "info" }>; md: string }[] = [];

  for (const item of patch.blocks ?? []) {
    if (!Number.isInteger(item.index) || item.index < 0) return { ok: false, code: "unknown-block" };
    const lecture = next.lectures.find((entry) => entry.meta.slug === item.slug);
    if (!lecture) return { ok: false, code: "unknown-block" };
    const section = lecture.sections.find((entry) => entry.id === item.sectionId);
    if (!section || item.index >= section.blocks.length) return { ok: false, code: "unknown-block" };

    const target = section.blocks[item.index];
    if (item.md !== undefined) {
      if (target.kind !== "prose" && target.kind !== "info") return { ok: false, code: "not-editable" };
      if (item.md.length > MD_MAX_CHARS) return { ok: false, code: "invalid" };
      mdUpdates.push({ target, md: item.md });
    }
    if (item.remove === true) {
      const mapKey = `${item.slug}\0${item.sectionId}`;
      let group = removalsBySection.get(mapKey);
      if (!group) {
        group = { blocks: section.blocks, indices: new Set() };
        removalsBySection.set(mapKey, group);
      }
      group.indices.add(item.index);
    }
  }

  for (const { target, md } of mdUpdates) {
    target.md = md;
  }
  for (const { blocks, indices } of removalsBySection.values()) {
    const sorted = [...indices].sort((a, b) => b - a);
    for (const index of sorted) {
      blocks.splice(index, 1);
    }
  }

  // 4. Remove empty sections; check empty-lecture on kept lectures
  for (const lecture of next.lectures) {
    if (removeLectures.has(lecture.meta.slug)) continue;
    lecture.sections = lecture.sections.filter((section) => section.blocks.length > 0);
    lecture.meta.outline = lecture.sections.map(({ id, title, kind }) => ({ id, title, kind }));
    if (lecture.sections.length === 0) return { ok: false, code: "empty-lecture" };
  }

  // 5. Drop removed lectures, check last-lecture, renumber 1..N
  next.lectures = next.lectures.filter((lecture) => !removeLectures.has(lecture.meta.slug));
  if (next.lectures.length === 0) return { ok: false, code: "last-lecture" };
  next.lectures.forEach((lecture, idx) => {
    lecture.meta.number = idx + 1;
  });

  // 6. Rebuild index
  next.index = next.lectures.map(toIndexEntry);

  // 7. Validate whole siteDataSchema
  const parsed = siteDataSchema.safeParse(next);
  if (!parsed.success) return { ok: false, code: "invalid" };
  return { ok: true, site: parsed.data };
}
