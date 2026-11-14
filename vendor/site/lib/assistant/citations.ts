import type { SitePaths } from "@site/site/paths";

/** What a citation needs to know about a lecture: its number and its sections in order. */
export interface CitableLecture {
  slug: string;
  number: number;
  sections: { id: string; title: string }[];
}

/** The label the assistant sees on section `index` (0-based) of lecture `number`, e.g. "[L2 §1]". */
export function citationLabel(number: number, index: number): string {
  return `[L${number} §${index + 1}]`;
}

const LABEL = String.raw`L\d+\s*§\s*\d+`;
// One bracket holding one or more labels, not followed by "(" (so Markdown links stay untouched).
const BRACKET = new RegExp(String.raw`\[(${LABEL}(?:\s*[,;]\s*${LABEL})*)\](?!\()`, "g");
const PART = /L(\d+)\s*§\s*(\d+)/;

/**
 * Turns the assistant's section labels into Markdown links to those sections. Code decides what is
 * valid: a label naming a lecture or section the course does not have becomes plain text.
 */
export function linkCitations(text: string, lectures: CitableLecture[], paths: SitePaths): string {
  return text.replace(BRACKET, (_whole, inner: string) =>
    inner
      .split(/\s*[,;]\s*/)
      .map((part) => {
        const match = PART.exec(part);
        const lecture = match ? lectures.find((entry) => entry.number === Number(match[1])) : undefined;
        const section = match && lecture ? lecture.sections[Number(match[2]) - 1] : undefined;
        if (!lecture || !section) return part.replace(/\s+/g, " ");
        return `[Lecture ${lecture.number} › ${section.title}](${paths.lecture(lecture.slug)}#${section.id})`;
      })
      .join(", "),
  );
}
