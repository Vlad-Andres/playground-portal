import type { Block, Concept, QuizQuestion } from "@site/content/types";

/** A content block as JSON: interactive components and exercise sheets become references. */
export type ReviewBlock =
  | Exclude<Block, { kind: "exercises" }>
  | { kind: "widget"; type: string; title: string; description?: string }
  | { kind: "exercises"; title: string };

export interface ReviewSection {
  id: string;
  title: string;
  blocks: ReviewBlock[];
}

export interface ReviewLecture {
  slug: string;
  number: number;
  title: string;
  href: string;
  concepts: Concept[];
  quiz: QuizQuestion[];
  sections: ReviewSection[];
}

export interface ReviewData {
  lectures: ReviewLecture[];
}

export function toReviewBlock(block: Block): ReviewBlock {
  if (block.kind === "widget") return { kind: "widget", type: block.type, title: block.title, description: block.description };
  if (block.kind === "exercises") return { kind: "exercises", title: block.sheet.title };
  return block;
}

/** Markdown-ish text of a block, for term extraction, cloze sentences and the assistant. */
export function blockText(block: ReviewBlock, concepts: Concept[]): string {
  switch (block.kind) {
    case "prose":
      return block.md;
    case "info":
      return `**${block.title}.** ${block.md}`;
    case "concepts":
      return block.ids
        .map((id) => concepts.find((concept) => concept.id === id))
        .filter((concept): concept is Concept => Boolean(concept))
        .map((concept) => `**${concept.term}**: ${concept.short} ${concept.detail ?? ""}`)
        .join("\n\n");
    case "formula":
      return block.caption ?? "";
    case "code":
      return `${block.caption ?? ""}\n${block.code}`;
    case "table":
      return [block.caption ?? "", block.headers.join(" | "), ...block.rows.map((row) => row.join(" | "))].join("\n");
    case "figure":
      return block.caption ?? block.alt;
    case "steps":
      return [`**${block.title}**`, block.intro ?? "", ...block.steps.map((step) => `**${step.title}**: ${step.md}`)].join("\n\n");
    case "timeline":
      return block.items.map((item) => `**${item.title}**: ${item.md}`).join("\n\n");
    case "list":
      return block.items.join("\n");
    case "recall":
      return block.cards.map((card) => `${card.prompt} ${card.answer}`).join("\n");
    case "practice":
      return block.tasks.map((task) => task.prompt).join("\n");
    case "widget":
      return `${block.title}. ${block.description ?? ""}`;
    case "custom":
      return `${block.title}. ${block.description}`;
    case "exercises":
      return block.title;
  }
}
