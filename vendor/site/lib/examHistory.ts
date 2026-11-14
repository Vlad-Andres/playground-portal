/** Practice-exam results kept in this browser (newest first). Never sent anywhere. */
export interface ExamLectureResult {
  slug: string;
  right: number;
  total: number;
}

export interface ExamAttempt {
  /** Milliseconds since the epoch. */
  at: number;
  score: number;
  total: number;
  byLecture: ExamLectureResult[];
}

export const EXAM_HISTORY_LIMIT = 10;

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

function reviveLectureResult(raw: unknown): ExamLectureResult | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  if (typeof entry.slug !== "string" || !isCount(entry.right) || !isCount(entry.total)) return null;
  return { slug: entry.slug, right: entry.right, total: entry.total };
}

function reviveAttempt(raw: unknown): ExamAttempt | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  if (!isCount(entry.at) || !isCount(entry.score) || !isCount(entry.total)) return null;
  const byLecture = Array.isArray(entry.byLecture)
    ? entry.byLecture.map(reviveLectureResult).filter((value): value is ExamLectureResult => value !== null)
    : [];
  return { at: entry.at, score: entry.score, total: entry.total, byLecture };
}

export function reviveExamHistory(raw: unknown): ExamAttempt[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map(reviveAttempt).filter((value): value is ExamAttempt => value !== null).slice(0, EXAM_HISTORY_LIMIT);
}

export function addExamAttempt(history: ExamAttempt[], attempt: ExamAttempt): ExamAttempt[] {
  if (attempt.total === 0) return history;
  return [attempt, ...history].slice(0, EXAM_HISTORY_LIMIT);
}

export function latestTwo(history: ExamAttempt[]): { latest: ExamAttempt | null; previous: ExamAttempt | null } {
  return { latest: history[0] ?? null, previous: history[1] ?? null };
}
