import type { BlockSource } from "@core/schema";

/** Whole days from `today` to an ISO exam date; null when absent or in the past. */
export function daysUntil(examDate: string | undefined, today: Date): number | null {
  if (!examDate) return null;
  const [year, month, day] = examDate.split("-").map(Number);
  const exam = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((exam - now) / 86_400_000);
  return days >= 0 ? days : null;
}

/** "slides.pdf · p. 12, 13 · notes.pdf · p. 2" */
export function sourceLabel(source: BlockSource): string {
  const pages = new Map<string, number[]>();
  for (const { file, page } of source) pages.set(file, [...(pages.get(file) ?? []), page]);
  return [...pages].map(([file, list]) => `${file} · p. ${list.join(", ")}`).join(" · ");
}
