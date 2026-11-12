import type { Material } from "./types";

/** Course languages the generator supports; the portal offers the same list. */
export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr", "es", "it", "pt", "ro", "pl"] as const;

/**
 * Common short words per language, without diacritics and without one-letter words, so that
 * maths or code variables such as `a`, `i` and `e` never count.
 */
const STOPWORDS: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  en: "the and of to in is that for with as are this be by on or from which an it can not we has have",
  nl: "de het een en van is dat op te voor met zijn niet aan er ook als bij door naar wordt deze maar om uit",
  de: "der die das und ist nicht mit den von zu ein eine auf fur dem des sich auch als wird bei oder sind dass werden",
  fr: "le la les des et est un une du dans que pour qui pas sur au par avec ce sont ne plus cette ou aux",
  es: "el la los las de que en un una es por con para del se no como mas su al lo son pero este",
  it: "il la di che un una per in con non del della le sono si da come piu anche dei nel alla gli",
  pt: "os as de que em um uma para com nao do da por se dos das mais como ao sao na",
  ro: "si in de la cu este un care pe din sau pentru nu se mai sunt ca prin al ale aceasta fie intre",
  pl: "nie na sie do to ze jest jak ale po co tak za od dla przez sa lub oraz byc moze",
};

const WORDS = Object.fromEntries(Object.entries(STOPWORDS).map(([code, list]) => [code, new Set(list.split(" "))])) as Record<string, Set<string>>;

const MIN_HITS = 5;
const LEAD = 1.3;
const CLEAR_SHARE = 0.8;
const MIXED_SHARE = 0.2;

export interface LanguageGuess {
  kind: "clear" | "mixed" | "unknown";
  top: string | null;
  second: string | null;
  share: number;
}

export type LanguageDecision = { language: string; source: "user" | "material" | "portal" } | { ask: string[] };

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
}

/** The language a page counts for, or null when no language leads clearly enough. */
function pageLanguage(text: string): string | null {
  const hits = new Map<string, number>();
  for (const word of words(text)) {
    for (const [code, list] of Object.entries(WORDS)) if (list.has(word)) hits.set(code, (hits.get(code) ?? 0) + 1);
  }
  const ranked = [...hits].sort((a, b) => b[1] - a[1]);
  const [best, next] = ranked;
  if (!best || best[1] < MIN_HITS) return null;
  if (next && best[1] < LEAD * next[1]) return null;
  return best[0];
}

/** Which language the material is written in, decided page by page from common words (no model call). */
export function detectLanguage(materials: Material[]): LanguageGuess {
  const counts = new Map<string, number>();
  for (const material of materials) {
    for (const page of material.pages) {
      const language = pageLanguage(page.text);
      if (language) counts.set(language, (counts.get(language) ?? 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return { kind: "unknown", top: null, second: null, share: 0 };
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const share = top[1] / total;
  const secondShare = second ? second[1] / total : 0;
  const kind = share >= CLEAR_SHARE ? "clear" : secondShare >= MIXED_SHARE ? "mixed" : "clear";
  return { kind, top: top[0], second: second ? second[0] : null, share };
}

/** The course language: the person's choice, else clear material, else ask (mixed), else the portal language. */
export function decideLanguage(input: { requested: string; locale: string; guess: LanguageGuess }): LanguageDecision {
  const { requested, locale, guess } = input;
  if (requested !== "auto") return { language: requested, source: "user" };
  if (guess.kind === "clear" && guess.top) return { language: guess.top, source: "material" };
  if (guess.kind === "mixed" && guess.top && guess.second) return { ask: [...new Set([guess.top, guess.second, locale])] };
  return { language: (SUPPORTED_LANGUAGES as readonly string[]).includes(locale) ? locale : "en", source: "portal" };
}
