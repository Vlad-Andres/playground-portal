import type { LectureIndexEntry, LectureMeta } from "@site/content/types";

export type { LectureIndexEntry } from "@site/content/types";

export function indexMetas(index: LectureIndexEntry[]): LectureMeta[] {
  return index.map((entry) => entry.meta);
}

export function countExercises(entry: LectureIndexEntry): number {
  return entry.exercises.reduce((sum, sheet) => sum + sheet.exercises.length, 0);
}

export function findLectureEntry(
  index: LectureIndexEntry[],
  slug: string,
): LectureIndexEntry | undefined {
  return index.find((entry) => entry.meta.slug === slug);
}

export function neighbourLectures(index: LectureIndexEntry[], slug: string) {
  const position = index.findIndex((entry) => entry.meta.slug === slug);
  return {
    previous: position > 0 ? index[position - 1].meta : null,
    next: position >= 0 && position < index.length - 1 ? index[position + 1].meta : null,
  };
}
