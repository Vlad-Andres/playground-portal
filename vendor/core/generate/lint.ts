import type { LectureFile } from "../schema";
import type { Problem } from "../validate";
import { blockTarget, DEPTH_TARGETS } from "./prompts";
import type { Brief } from "./types";

const STRUCTURED = new Set(["table", "steps", "timeline", "widget", "formula", "code"]);

function warning(code: string, path: string, message: string, fix: string): Problem {
  return { code, severity: "warning", file: "", path, message, fix };
}

/** Quality warnings for a generated lecture (no model call). `pageCount` enables the size check W307. */
export function lintLecture(lecture: LectureFile, brief: Brief, pageCount = 0): Problem[] {
  const target = DEPTH_TARGETS[brief.depth];
  const blocks = lecture.sections.flatMap((section, sectionIndex) =>
    section.blocks.map((block, blockIndex) => ({ block, path: `sections[${sectionIndex}].blocks[${blockIndex}]` })),
  );
  const problems: Problem[] = [];
  if (lecture.concepts.length < target.concepts) {
    problems.push(warning("W301", "concepts", `Only ${lecture.concepts.length} concepts; the ${brief.depth} target is ${target.concepts}.`, `Add ${target.concepts - lecture.concepts.length} more concepts from the material.`));
  }
  if (brief.quizzes && lecture.quiz.length < target.quiz) {
    problems.push(warning("W302", "quiz", `Only ${lecture.quiz.length} quiz questions; the target is ${target.quiz}.`, `Add ${target.quiz - lecture.quiz.length} more quiz questions.`));
  }
  if (!blocks.some(({ block }) => block.kind === "recall" || block.kind === "practice")) {
    problems.push(warning("W303", "sections", "No recall or practice block.", "Add a recall or practice block."));
  }
  const prose = blocks.filter(({ block }) => block.kind === "prose").length;
  if (blocks.length > 0 && prose / blocks.length > 0.6) {
    problems.push(warning("W304", "sections", `${prose} of ${blocks.length} blocks are prose (over 60%).`, "Add tables, steps, timelines, formulas, code or widgets."));
  }
  if (!blocks.some(({ block }) => STRUCTURED.has(block.kind))) {
    problems.push(warning("W305", "sections", "No table, steps, timeline, widget, formula or code block.", "Add at least one structured block."));
  }
  const wanted = Math.ceil(blockTarget(pageCount, brief.depth) * 0.7);
  if (pageCount > 0 && blocks.length < wanted) {
    problems.push(warning("W307", "sections", `Only ${blocks.length} blocks for ${pageCount} pages; expected at least ${wanted}.`, `Add ${wanted - blocks.length} more blocks covering pages that are not covered yet.`));
  }
  for (const { block, path } of blocks) {
    if (!block.source) problems.push(warning("W306", path, `A ${block.kind} block has no source.`, "Add the source pages this block came from."));
  }
  return problems;
}
