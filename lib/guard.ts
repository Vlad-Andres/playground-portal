import { createHash, timingSafeEqual } from "node:crypto";

export const LANGUAGES = ["en", "nl", "de", "fr", "es", "it", "pt", "ro", "pl"] as const;
export const LEVELS = ["school", "university", "professional"] as const;
export type Language = (typeof LANGUAGES)[number];
export type Level = (typeof LEVELS)[number];

const MIN_CODE_LENGTH = 12;

/** Generation runs only when the flag is on AND an access code of 12+ characters is configured. */
export function generationEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PORTAL_ENABLE_GENERATION === "true" && (env.PORTAL_ACCESS_CODE ?? "").length >= MIN_CODE_LENGTH;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time comparison of the given code with PORTAL_ACCESS_CODE. */
export function accessCodeMatches(given: string, env: NodeJS.ProcessEnv): boolean {
  const expected = env.PORTAL_ACCESS_CODE ?? "";
  if (expected.length < MIN_CODE_LENGTH) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

/** The UTC day as YYYY-MM-DD. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dayPrefix(day: string): string {
  return `days/${day}/`;
}

export async function underDailyLimit(
  day: string,
  limit: number,
  countKeys: (prefix: string) => Promise<number>,
): Promise<boolean> {
  return (await countKeys(dayPrefix(day))) < limit;
}

export function dailyJobLimit(env: NodeJS.ProcessEnv): number {
  const parsed = Number.parseInt(env.PORTAL_DAILY_JOB_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}
