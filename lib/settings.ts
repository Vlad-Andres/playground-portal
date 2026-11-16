import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { COURSE_KEY } from "@/lib/sites/store";

const SETTINGS_KEY = "config/settings.json";
const MIN_ENV_CODE_LENGTH = 12;
/** Invite codes: 4–40 letters, digits or dashes. */
export const CODE_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

export interface InviteCode {
  id: string;
  label: string;
  /** The code people type, in plain text (the admin chooses it). */
  code?: string;
  /** Older codes only: the SHA-256 of a generated code that was shown once. */
  hash?: string;
  active: boolean;
  createdAt: string;
  /** Jobs this code may start per UTC month (a beta group's allowance); missing or null = no extra cap. */
  monthlyJobLimit?: number | null;
}

export interface Settings {
  /** Stops new jobs and further steps of running ones. Default false. */
  generationPaused: boolean;
  /** 1..500; null = use PORTAL_DAILY_JOB_LIMIT (default 10). */
  dailyJobLimit: number | null;
  /** The generation model id; null = use GEMINI_MODEL (default). */
  model: string | null;
  /** Shown above the builder, per language; "" = none. */
  announcement: { en: string; ro: string };
  codes: InviteCode[];
  /** The course the landing links to as a demo, per page language; null = no demo button. */
  demoCourseKey: { en: string | null; ro: string | null };
}

const inviteCodeSchema = z
  .object({
    id: z.string().regex(/^[0-9a-f]{8}$/),
    label: z.string().trim().min(1).max(60),
    code: z.string().regex(CODE_PATTERN).optional(),
    hash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    active: z.boolean(),
    createdAt: z.string().max(40),
    monthlyJobLimit: z.number().int().min(1).max(1000).nullable().optional(),
  })
  .strict()
  .refine((entry) => entry.code !== undefined || entry.hash !== undefined, { message: "A code needs its text or an older hash." });

export const settingsSchema: z.ZodType<Settings> = z
  .object({
    generationPaused: z.boolean(),
    dailyJobLimit: z.number().int().min(1).max(500).nullable(),
    model: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,60}$/).nullable(),
    announcement: z.object({ en: z.string().max(300), ro: z.string().max(300) }).strict(),
    codes: z.array(inviteCodeSchema).max(50),
    // Settings saved before this field existed load with no demo.
    demoCourseKey: z
      .object({ en: z.string().regex(COURSE_KEY).nullable(), ro: z.string().regex(COURSE_KEY).nullable() })
      .strict()
      .default({ en: null, ro: null }),
  })
  .strict();

export const DEFAULT_SETTINGS: Settings = {
  generationPaused: false,
  dailyJobLimit: null,
  model: null,
  announcement: { en: "", ro: "" },
  codes: [],
  demoCourseKey: { en: null, ro: null },
};

/** Settings with the demo course per language set ("" clears one); null when a key is not an existing course. */
export function withDemoCourses(settings: Settings, picked: { en: string; ro: string }, knownKeys: string[]): Settings | null {
  const pick = (value: string): string | null | undefined => {
    const key = value.trim();
    if (key === "") return null;
    return knownKeys.includes(key) ? key : undefined;
  };
  const en = pick(picked.en);
  const ro = pick(picked.ro);
  if (en === undefined || ro === undefined) return null;
  return { ...settings, demoCourseKey: { en, ro } };
}

/** The demo course link for a page language, or null when none is set. */
export function demoCourseUrl(settings: Settings, locale: string): string | null {
  const key = locale === "en" || locale === "ro" ? settings.demoCourseKey[locale] : null;
  return key ? `/courses/${key}/` : null;
}

function defaults(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}

/** The stored settings, read fresh on every call. A missing file gives the defaults; an invalid one is logged and also gives the defaults. */
export async function readSettings(store: Store): Promise<Settings> {
  const body = await store.read(SETTINGS_KEY);
  if (body === null) return defaults();
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(body));
    if (parsed.success) return parsed.data;
  } catch {
    // fall through to the log line
  }
  logEvent("settings.invalid");
  return defaults();
}

/** Validates, then stores. Throws on an invalid value and writes nothing. */
export async function writeSettings(store: Store, settings: Settings): Promise<void> {
  const parsed = settingsSchema.parse(settings);
  await store.write(SETTINGS_KEY, `${JSON.stringify(parsed)}\n`);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** A new invite code entry with the code the admin typed, kept in plain text. */
export function newInviteCode(label: string, code: string, now: Date): InviteCode {
  return { id: randomBytes(4).toString("hex"), label: label.trim(), code: code.trim(), active: true, createdAt: now.toISOString() };
}

/** Invite codes match ignoring case and surrounding spaces. */
function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

/** Settings with a new invite code added, or "taken" when another code already uses that text. */
export function addInviteCode(settings: Settings, label: string, code: string, now: Date): Settings | "taken" {
  const wanted = normalizeCode(code);
  if (settings.codes.some((entry) => entry.code !== undefined && normalizeCode(entry.code) === wanted)) return "taken";
  return { ...settings, codes: [...settings.codes, newInviteCode(label, code, now)] };
}

/**
 * "env" when the code is PORTAL_ACCESS_CODE (12+ characters, exact); the id of an active invite code whose text
 * matches ignoring case and surrounding spaces (or, for an older code, whose hash matches); otherwise null.
 * Every candidate is compared in constant time and none returns early.
 */
export function matchCode(given: string, env: NodeJS.ProcessEnv, settings: Settings): string | null {
  const given256 = digest(given);
  let found: string | null = null;
  const envCode = env.PORTAL_ACCESS_CODE ?? "";
  const envMatches = timingSafeEqual(given256, digest(envCode)) && envCode.length >= MIN_ENV_CODE_LENGTH;
  if (envMatches) found = "env";
  const plain256 = digest(normalizeCode(given));
  for (const entry of settings.codes) {
    const stored = entry.code !== undefined ? digest(normalizeCode(entry.code)) : Buffer.from(entry.hash ?? "", "hex");
    const candidate = entry.code !== undefined ? plain256 : given256;
    const matches = stored.length === candidate.length && timingSafeEqual(candidate, stored) && entry.active;
    if (matches && found === null) found = entry.id;
  }
  return found;
}

/** Where the jobs an invite code started in a UTC month (YYYY-MM) are counted. */
export function codeMonthPrefix(codeId: string, now: Date): string {
  return `codes/${codeId}/months/${now.toISOString().slice(0, 7)}/`;
}

/** How many jobs an invite code started in the UTC month of `now`. */
export async function codeJobsThisMonth(store: Store, codeId: string, now: Date): Promise<number> {
  return (await store.list(codeMonthPrefix(codeId, now))).length;
}

/** Settings with one invite code's monthly limit set (or cleared with null); null when the code is unknown. */
export function withCodeLimit(settings: Settings, id: string, limit: number | null): Settings | null {
  if (!settings.codes.some((entry) => entry.id === id)) return null;
  return { ...settings, codes: settings.codes.map((entry) => (entry.id === id ? { ...entry, monthlyJobLimit: limit } : entry)) };
}
