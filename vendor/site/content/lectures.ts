import type { Lecture } from "@site/content/types";

export function findLecture(lectures: Lecture[], slug: string): Lecture | undefined {
  return lectures.find((lecture) => lecture.meta.slug === slug);
}
