import { z } from "zod";
import { LOCALES, type Locale } from "@/i18n/config";
import type { Store } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import en from "@/messages/en.json";
import ro from "@/messages/ro.json";

/**
 * The texts live in messages/<locale>.json (the defaults, shipped with each deploy). The owner can
 * override any of them from /admin; overrides are stored in config/messages.json as flat
 * "namespace.key" → text maps and laid over the defaults on every request.
 */
export const OVERRIDES_KEY = "config/messages.json";
export const MESSAGES_TAG = "messages";
export const MAX_TEXT = 2000;

type Tree = { [key: string]: unknown } | unknown[];
export type Overrides = Record<Locale, Record<string, string>>;
export const EMPTY_OVERRIDES: Overrides = { en: {}, ro: {} };

export const DEFAULT_MESSAGES: Record<Locale, Tree> = { en, ro };

const overridesSchema = z
  .object({ en: z.record(z.string(), z.string().max(MAX_TEXT)), ro: z.record(z.string(), z.string().max(MAX_TEXT)) })
  .strict();

export function flattenMessages(tree: Tree, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  const entries = Array.isArray(tree) ? tree.map((value, index) => [String(index), value] as const) : Object.entries(tree);
  for (const [key, value] of entries) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result[full] = value;
    else if (value && typeof value === "object") Object.assign(result, flattenMessages(value as Tree, full));
  }
  return result;
}

/** A copy of the default messages with the overrides set; unknown keys are ignored. */
export function applyOverrides<T extends Tree>(base: T, overrides: Record<string, string>): T {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    const parts = key.split(".");
    let node: unknown = result;
    for (const part of parts.slice(0, -1)) node = node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
    const last = parts[parts.length - 1];
    if (node && typeof node === "object" && typeof (node as Record<string, unknown>)[last] === "string") (node as Record<string, unknown>)[last] = value;
  }
  return result;
}

const placeholders = (text: string) => [...new Set([...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => match[1]))].sort();
const tags = (text: string) => [...text.matchAll(/<(\/?)([a-z]+)>/gi)].map((match) => `${match[1]}${match[2]}`).sort();

/** null when `value` can safely replace `base`; otherwise a short reason for the admin. */
export function checkOverride(base: string, value: string): string | null {
  if (value.trim() === "") return "The text is empty.";
  if (value.length > MAX_TEXT) return `At most ${MAX_TEXT} characters.`;
  let depth = 0;
  for (const char of value) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) return "The braces { } do not match.";
  if (placeholders(base).join() !== placeholders(value).join()) return `Keep exactly these placeholders: ${placeholders(base).map((name) => `{${name}}`).join(" ") || "(none)"}.`;
  if (tags(base).join() !== tags(value).join()) return `Keep the same tags as the default: ${tags(base).filter((tag) => !tag.startsWith("/")).map((tag) => `<${tag}>…</${tag}>`).join(" ") || "(none)"}.`;
  return null;
}

export async function readOverrides(store: Store): Promise<Overrides> {
  const body = await store.read(OVERRIDES_KEY);
  if (body === null) return structuredClone(EMPTY_OVERRIDES);
  try {
    const parsed = overridesSchema.safeParse(JSON.parse(body));
    if (parsed.success) return parsed.data;
  } catch {
    // fall through
  }
  logEvent("messages.invalid");
  return structuredClone(EMPTY_OVERRIDES);
}

export interface TranslationChange {
  locale: Locale;
  key: string;
  /** null resets the text to the default. */
  value: string | null;
}

/** Applies the valid changes and returns the invalid ones; a value equal to the default removes the override. */
export async function updateOverrides(
  store: Store,
  changes: TranslationChange[],
): Promise<{ saved: number; errors: { locale: Locale; key: string; message: string }[] }> {
  const overrides = await readOverrides(store);
  const errors: { locale: Locale; key: string; message: string }[] = [];
  let saved = 0;
  for (const change of changes) {
    if (!(LOCALES as readonly string[]).includes(change.locale)) continue;
    const base = flattenMessages(DEFAULT_MESSAGES[change.locale])[change.key];
    if (base === undefined) {
      errors.push({ locale: change.locale, key: change.key, message: "Unknown text." });
      continue;
    }
    if (change.value === null || change.value === base) {
      delete overrides[change.locale][change.key];
      saved += 1;
      continue;
    }
    const problem = checkOverride(base, change.value);
    if (problem) {
      errors.push({ locale: change.locale, key: change.key, message: problem });
      continue;
    }
    overrides[change.locale][change.key] = change.value;
    saved += 1;
  }
  if (saved > 0) await store.write(OVERRIDES_KEY, `${JSON.stringify(overrides)}\n`);
  return { saved, errors };
}
