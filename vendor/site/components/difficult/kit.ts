import type { Concept, QuizQuestion, RecallCard } from "@site/content/types";
import type { DifficultItem } from "@site/lib/difficult";
import { blockText, type ReviewBlock, type ReviewData, type ReviewLecture } from "@site/lib/reviewData";

export interface ResolvedItem {
  item: DifficultItem;
  lecture: ReviewLecture;
  sectionTitle: string;
  blocks: ReviewBlock[];
  /** Markdown-ish text of the flagged part. */
  text: string;
  href: string;
}

/** Find the content of a flagged item; null if the lecture changed and it no longer exists. */
export function resolveItem(data: ReviewData, item: DifficultItem): ResolvedItem | null {
  const lecture = data.lectures.find((candidate) => candidate.slug === item.slug);
  const section = lecture?.sections.find((candidate) => candidate.id === item.sectionId);
  if (!lecture || !section) return null;

  const blocks =
    item.blockIndex === null
      ? section.blocks.filter((block) => block.kind !== "list")
      : section.blocks[item.blockIndex]
        ? [section.blocks[item.blockIndex]]
        : [];
  if (blocks.length === 0) return null;

  const anchor = item.blockIndex === null ? section.id : `${section.id}--b${item.blockIndex}`;
  return {
    item,
    lecture,
    sectionTitle: section.title,
    blocks,
    text: blocks.map((block) => blockText(block, lecture.concepts)).join("\n\n"),
    href: `${lecture.href}#${anchor}`,
  };
}

/** Markdown and LaTeX markers removed, whitespace collapsed. */
export function plainText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*(?:[-•]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTerm(raw: string) {
  return plainText(raw).replace(/[.:,;]+$/, "").trim();
}

/** Bold phrases are what the lecture itself marks as key: they become the terms to learn. */
export function extractTerms(text: string, concepts: Concept[], limit = 8) {
  const seen = new Set<string>();
  const terms: string[] = [];
  const push = (term: string) => {
    const lower = term.toLowerCase();
    if (term.length < 2 || term.length > 60 || seen.has(lower) || !/[a-zA-Z]/.test(term)) return;
    seen.add(lower);
    terms.push(term);
  };

  for (const match of text.matchAll(/\*\*([^*]+)\*\*/g)) push(cleanTerm(match[1]));

  if (terms.length < 3) {
    const lowerText = text.toLowerCase();
    for (const concept of concepts) {
      if (lowerText.includes(concept.term.toLowerCase())) push(concept.term);
    }
  }
  return terms.slice(0, limit);
}

export function conceptFor(term: string, concepts: Concept[]) {
  const lower = term.toLowerCase();
  return (
    concepts.find((concept) => concept.term.toLowerCase() === lower) ??
    concepts.find((concept) => {
      const conceptTerm = concept.term.toLowerCase();
      return lower.length > 3 && (conceptTerm.includes(lower) || lower.includes(conceptTerm));
    })
  );
}

function sentences(text: string) {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z*(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** One sentence where the term appears: the explanation shown when a concept-map node is opened. */
export function contextFor(term: string, text: string, concepts: Concept[]) {
  const concept = conceptFor(term, concepts);
  if (concept) return concept.short;
  const lower = term.toLowerCase();
  const sentence = sentences(text).find((candidate) => plainText(candidate).toLowerCase().includes(lower));
  return sentence ? plainText(sentence) : "";
}

export type ClozePart = { kind: "text"; text: string } | { kind: "blank"; answer: string };

/** Sentences with their bold terms turned into blanks to fill (cloze deletion). */
export function clozeSentences(text: string, limit = 8): ClozePart[][] {
  const result: ClozePart[][] = [];
  for (const sentence of sentences(text)) {
    if (!sentence.includes("**")) continue;
    const parts: ClozePart[] = [];
    let blanks = 0;
    sentence.split(/\*\*([^*]+)\*\*/g).forEach((segment, index) => {
      if (index % 2 === 1) {
        const answer = cleanTerm(segment);
        if (answer.length > 0 && answer.length <= 60 && /[a-zA-Z0-9]/.test(answer)) {
          parts.push({ kind: "blank", answer });
          blanks += 1;
          return;
        }
      }
      const plain = plainText(segment);
      if (plain) parts.push({ kind: "text", text: plain });
    });
    const plainLength = parts.reduce((sum, part) => sum + (part.kind === "text" ? part.text.length : part.answer.length), 0);
    if (blanks > 0 && plainLength > 25) result.push(parts);
    if (result.length >= limit) break;
  }
  return result;
}

export interface Flashcard {
  front: string;
  back: string;
}

export function flashcardsFor(resolved: ResolvedItem, terms: string[]): Flashcard[] {
  const cards: Flashcard[] = [];
  const recall: RecallCard[] = resolved.blocks.flatMap((block) => (block.kind === "recall" ? block.cards : []));
  const section = resolved.lecture.sections.find((candidate) => candidate.id === resolved.item.sectionId);
  const sectionRecall = section?.blocks.flatMap((block) => (block.kind === "recall" ? block.cards : [])) ?? [];

  for (const card of [...recall, ...sectionRecall]) {
    if (!cards.some((existing) => existing.front === card.prompt)) cards.push({ front: card.prompt, back: card.answer });
  }
  for (const term of terms) {
    const concept = conceptFor(term, resolved.lecture.concepts);
    if (concept && !cards.some((existing) => existing.front.includes(concept.term))) {
      cards.push({ front: `What is ${concept.term}?`, back: concept.short });
    }
  }
  return cards.slice(0, 12);
}

/**
 * Lecture quiz questions that share the most distinctive key terms with the flagged part. Terms
 * found in many questions of the lecture (its topic, e.g. "Neo4j") say little and weigh less.
 */
export function relatedQuestions(lecture: ReviewLecture, terms: string[], limit = 3): QuizQuestion[] {
  const haystacks = lecture.quiz.map((question) =>
    [question.prompt, question.explanation, ...question.options.map((option) => option.text)].join(" ").toLowerCase(),
  );
  const needles = terms
    .map((term) => term.toLowerCase())
    .filter((term) => term.length > 3)
    .map((needle) => ({ needle, frequency: haystacks.filter((haystack) => haystack.includes(needle)).length }))
    .filter(({ frequency }) => frequency > 0 && frequency <= Math.max(1, lecture.quiz.length / 4));

  return lecture.quiz
    .map((question, index) => ({
      question,
      score: needles.reduce((sum, { needle, frequency }) => sum + (haystacks[index].includes(needle) ? 1 / frequency : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.question);
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function formatDue(due: number, now: number) {
  const diff = due - now;
  if (diff <= 0) return "due now";
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
