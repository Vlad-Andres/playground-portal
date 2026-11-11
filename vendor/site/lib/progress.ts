import type { LectureMeta } from "@site/content/types";

export const QUIZ_PASS_RATIO = 0.7;

export interface LectureProgress {
  sections: string[];
  quizBest: number;
  quizTotal: number;
}

export type ProgressState = Record<string, LectureProgress>;

export const emptyLectureProgress: LectureProgress = {
  sections: [],
  quizBest: 0,
  quizTotal: 0,
};

export function reviveProgress(raw: unknown): ProgressState | null {
  if (!raw || typeof raw !== "object") return null;

  const result: ProgressState = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Partial<LectureProgress>;
    result[slug] = {
      sections: Array.isArray(entry.sections) ? entry.sections.filter((id) => typeof id === "string") : [],
      quizBest: typeof entry.quizBest === "number" ? entry.quizBest : 0,
      quizTotal: typeof entry.quizTotal === "number" ? entry.quizTotal : 0,
    };
  }
  return result;
}

export interface LectureStats {
  completedSections: number;
  totalSections: number;
  ratio: number;
  quizBest: number;
  quizTotal: number;
  quizPassed: boolean;
  started: boolean;
  completed: boolean;
}

export function lectureStats(progress: ProgressState, meta: LectureMeta): LectureStats {
  const entry = progress[meta.slug] ?? emptyLectureProgress;
  const totalSections = meta.outline.length;
  const completedSections = meta.outline.filter((section) =>
    entry.sections.includes(section.id),
  ).length;
  const quizPassed =
    entry.quizTotal > 0 && entry.quizBest / entry.quizTotal >= QUIZ_PASS_RATIO;

  return {
    completedSections,
    totalSections,
    ratio: totalSections === 0 ? 0 : completedSections / totalSections,
    quizBest: entry.quizBest,
    quizTotal: entry.quizTotal,
    quizPassed,
    started: completedSections > 0 || entry.quizTotal > 0,
    completed: totalSections > 0 && completedSections === totalSections,
  };
}

export interface CourseStats {
  lecturesCompleted: number;
  lecturesStarted: number;
  totalLectures: number;
  ratio: number;
  quizzesPassed: number;
}

export function courseStats(progress: ProgressState, metas: LectureMeta[]): CourseStats {
  const stats = metas.map((meta) => lectureStats(progress, meta));
  const ratioSum = stats.reduce((sum, stat) => sum + stat.ratio, 0);

  return {
    lecturesCompleted: stats.filter((stat) => stat.completed).length,
    lecturesStarted: stats.filter((stat) => stat.started).length,
    totalLectures: metas.length,
    ratio: metas.length === 0 ? 0 : ratioSum / metas.length,
    quizzesPassed: stats.filter((stat) => stat.quizPassed).length,
  };
}
