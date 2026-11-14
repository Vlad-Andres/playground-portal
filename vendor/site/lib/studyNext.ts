import type { DifficultItem } from "@site/lib/difficult";
import type { ExamAttempt } from "@site/lib/examHistory";
import { QUIZ_PASS_RATIO, type ProgressState } from "@site/lib/progress";

/** How many suggestions the course home shows. */
export const STUDY_NEXT_LIMIT = 3;
/** A lecture counts as weak in the last practice exam below this share of right answers. */
export const EXAM_WEAK_RATIO = 0.6;

export type StudyNextKind = "exam" | "quiz" | "flagged" | "start";

export interface StudyNextItem {
  slug: string;
  number: number;
  title: string;
  kind: StudyNextKind;
  reason: string;
}

export interface StudyNextInput {
  lectures: { slug: string; number: number; title: string }[];
  progress: ProgressState;
  difficult: DifficultItem[];
  /** The latest practice exam, or null. */
  exam: ExamAttempt | null;
}

const RANK: Record<StudyNextKind, number> = { exam: 0, quiz: 1, flagged: 2, start: 3 };

/**
 * What to study next, from this browser's own answers only: weak lectures in the last practice exam,
 * then lecture quizzes below the pass mark, then parts flagged as difficult, then the next unstarted lecture.
 */
export function studyNext({ lectures, progress, difficult, exam }: StudyNextInput): StudyNextItem[] {
  const candidates: StudyNextItem[] = [];
  let firstUnstarted: StudyNextItem | null = null;

  for (const lecture of [...lectures].sort((a, b) => a.number - b.number)) {
    const base = { slug: lecture.slug, number: lecture.number, title: lecture.title };
    const entry = progress[lecture.slug];
    const row = exam?.byLecture.find((result) => result.slug === lecture.slug);
    const flagged = difficult.filter((item) => item.slug === lecture.slug).length;

    if (row && row.total > 0 && row.right / row.total < EXAM_WEAK_RATIO) {
      candidates.push({ ...base, kind: "exam", reason: `${row.total - row.right} of ${row.total} wrong in your last practice exam` });
    } else if (entry && entry.quizTotal > 0 && entry.quizBest / entry.quizTotal < QUIZ_PASS_RATIO) {
      candidates.push({ ...base, kind: "quiz", reason: `Best quiz score ${entry.quizBest} / ${entry.quizTotal}` });
    } else if (flagged > 0) {
      candidates.push({ ...base, kind: "flagged", reason: `${flagged} ${flagged === 1 ? "part" : "parts"} you marked as difficult` });
    } else if (!firstUnstarted && (!entry || (entry.sections.length === 0 && entry.quizTotal === 0))) {
      firstUnstarted = { ...base, kind: "start", reason: "Not started yet" };
    }
  }

  if (firstUnstarted) candidates.push(firstUnstarted);
  return candidates.sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.number - b.number).slice(0, STUDY_NEXT_LIMIT);
}
