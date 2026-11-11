/**
 * Difficult parts: sections or single blocks the student flagged, scheduled for review with
 * Leitner boxes (the spaced-repetition idea behind Anki), plus XP, a daily streak and goal.
 */

export type Rating = "again" | "hard" | "good" | "easy";

export interface DifficultItem {
  key: string;
  slug: string;
  sectionId: string;
  /** null when the whole section is flagged. */
  blockIndex: number | null;
  addedAt: number;
  /** Leitner box 1 (new, review now) … 5 (mastered). */
  box: number;
  due: number;
  reviews: number;
  lapses: number;
  note: string;
}

export interface DifficultState {
  items: Record<string, DifficultItem>;
  xp: number;
  streak: number;
  lastReviewDay: string | null;
  reviewsToday: number;
  matchBest: number | null;
}

export const emptyDifficultState: DifficultState = {
  items: {},
  xp: 0,
  streak: 0,
  lastReviewDay: null,
  reviewsToday: 0,
  matchBest: null,
};

export const MAX_BOX = 5;
export const DAILY_GOAL = 10;
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Days until the next review once an item reaches a box. */
export const BOX_INTERVAL_DAYS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

export const RATING_XP: Record<Rating, number> = { again: 2, hard: 5, good: 10, easy: 15 };

export function itemKey(slug: string, sectionId: string, blockIndex: number | null) {
  return blockIndex === null ? `${slug}#${sectionId}` : `${slug}#${sectionId}#${blockIndex}`;
}

export function blockAnchor(sectionId: string, blockIndex: number) {
  return `${sectionId}--b${blockIndex}`;
}

export function dayString(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function newItem(slug: string, sectionId: string, blockIndex: number | null, now: number): DifficultItem {
  return {
    key: itemKey(slug, sectionId, blockIndex),
    slug,
    sectionId,
    blockIndex,
    addedAt: now,
    box: 1,
    due: now,
    reviews: 0,
    lapses: 0,
    note: "",
  };
}

/** Where an item goes after a rating: box and next due time. */
export function schedule(item: DifficultItem, rating: Rating, now: number) {
  switch (rating) {
    case "again":
      return { box: 1, due: now + 10 * MINUTE };
    case "hard": {
      const box = Math.max(1, item.box);
      return { box, due: now + Math.max(10 * MINUTE, (BOX_INTERVAL_DAYS[box] * DAY) / 2) };
    }
    case "good": {
      const box = Math.min(MAX_BOX, item.box + 1);
      return { box, due: now + BOX_INTERVAL_DAYS[box] * DAY };
    }
    case "easy": {
      const box = Math.min(MAX_BOX, item.box + 2);
      return { box, due: now + BOX_INTERVAL_DAYS[box] * DAY * 1.5 };
    }
  }
}

export function applyReview(state: DifficultState, key: string, rating: Rating, now: number): DifficultState {
  const item = state.items[key];
  if (!item) return state;

  const today = dayString(now);
  const yesterday = dayString(now - DAY);
  const streak =
    state.lastReviewDay === today ? state.streak : state.lastReviewDay === yesterday ? state.streak + 1 : 1;
  const reviewsToday = state.lastReviewDay === today ? state.reviewsToday + 1 : 1;
  const next = schedule(item, rating, now);

  return {
    ...state,
    xp: state.xp + RATING_XP[rating],
    streak,
    lastReviewDay: today,
    reviewsToday,
    items: {
      ...state.items,
      [key]: {
        ...item,
        ...next,
        reviews: item.reviews + 1,
        lapses: rating === "again" ? item.lapses + 1 : item.lapses,
      },
    },
  };
}

/** Level n needs 50·n·(n+1)/2 XP in total: 50, 150, 300, 500… */
export function levelFor(xp: number) {
  let level = 1;
  while ((50 * level * (level + 1)) / 2 <= xp) level += 1;
  const floor = (50 * (level - 1) * level) / 2;
  const ceiling = (50 * level * (level + 1)) / 2;
  return { level, progress: (xp - floor) / (ceiling - floor), toNext: ceiling - xp };
}

/** A streak only counts if the student reviewed today or yesterday. */
export function liveStreak(state: DifficultState, now: number) {
  if (state.lastReviewDay === dayString(now) || state.lastReviewDay === dayString(now - DAY)) return state.streak;
  return 0;
}

export function reviewsDoneToday(state: DifficultState, now: number) {
  return state.lastReviewDay === dayString(now) ? state.reviewsToday : 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function reviveDifficult(raw: unknown): DifficultState | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<DifficultState>;
  const items: Record<string, DifficultItem> = {};

  for (const value of Object.values(source.items ?? {})) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Partial<DifficultItem>;
    if (typeof entry.slug !== "string" || typeof entry.sectionId !== "string") continue;
    const blockIndex = isNumber(entry.blockIndex) ? entry.blockIndex : null;
    const key = itemKey(entry.slug, entry.sectionId, blockIndex);
    items[key] = {
      key,
      slug: entry.slug,
      sectionId: entry.sectionId,
      blockIndex,
      addedAt: isNumber(entry.addedAt) ? entry.addedAt : 0,
      box: isNumber(entry.box) ? Math.min(MAX_BOX, Math.max(1, Math.round(entry.box))) : 1,
      due: isNumber(entry.due) ? entry.due : 0,
      reviews: isNumber(entry.reviews) ? entry.reviews : 0,
      lapses: isNumber(entry.lapses) ? entry.lapses : 0,
      note: typeof entry.note === "string" ? entry.note : "",
    };
  }

  return {
    items,
    xp: isNumber(source.xp) ? source.xp : 0,
    streak: isNumber(source.streak) ? source.streak : 0,
    lastReviewDay: typeof source.lastReviewDay === "string" ? source.lastReviewDay : null,
    reviewsToday: isNumber(source.reviewsToday) ? source.reviewsToday : 0,
    matchBest: isNumber(source.matchBest) ? source.matchBest : null,
  };
}
