import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";

const SETTINGS_KEY = "config/settings.json";
const MIN_ENV_CODE_LENGTH = 12;

export interface InviteCode {
  id: string;
  label: string;
  hash: string;
  active: boolean;
  createdAt: string;
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
}

const inviteCodeSchema = z
  .object({
    id: z.string().regex(/^[0-9a-f]{8}$/),
    label: z.string().trim().min(1).max(60),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
    active: z.boolean(),
    createdAt: z.string().max(40),
  })
  .strict();

export const settingsSchema: z.ZodType<Settings> = z
  .object({
    generationPaused: z.boolean(),
    dailyJobLimit: z.number().int().min(1).max(500).nullable(),
    model: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,60}$/).nullable(),
    announcement: z.object({ en: z.string().max(300), ro: z.string().max(300) }).strict(),
    codes: z.array(inviteCodeSchema).max(50),
  })
  .strict();

export const DEFAULT_SETTINGS: Settings = {
  generationPaused: false,
  dailyJobLimit: null,
  model: null,
  announcement: { en: "", ro: "" },
  codes: [],
};

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

/** A new invite code (shown once; only its hash is kept) and the entry to store. */
export function newInviteCode(label: string, now: Date): { code: string; entry: InviteCode } {
  const code = randomBytes(12).toString("base64url");
  return {
    code,
    entry: { id: randomBytes(4).toString("hex"), label: label.trim(), hash: createHash("sha256").update(code, "utf8").digest("hex"), active: true, createdAt: now.toISOString() },
  };
}

/**
 * "env" when the code is PORTAL_ACCESS_CODE (12+ characters); the id of an active invite code whose hash
 * matches; otherwise null. Every candidate is compared in constant time and none returns early.
 */
export function matchCode(given: string, env: NodeJS.ProcessEnv, settings: Settings): string | null {
  const given256 = digest(given);
  let found: string | null = null;
  const envCode = env.PORTAL_ACCESS_CODE ?? "";
  const envMatches = timingSafeEqual(given256, digest(envCode)) && envCode.length >= MIN_ENV_CODE_LENGTH;
  if (envMatches) found = "env";
  for (const entry of settings.codes) {
    const matches = timingSafeEqual(given256, Buffer.from(entry.hash, "hex")) && entry.active;
    if (matches && found === null) found = entry.id;
  }
  return found;
}
