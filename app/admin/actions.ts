"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { removeCourseAsAdmin } from "@/lib/admin/overview";
import { adminConfigured, getAdminSession, requireAdmin, tokenMatches } from "@/lib/admin/session";
import { defaultStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { setReportStatus } from "@/lib/reports";
import { addInviteCode, readSettings, withCodeLimit, withDemoCourses, writeSettings } from "@/lib/settings";
import { courseTag } from "@/lib/sites/load";
import { importBundle, type ImportResult } from "@/lib/sites/import";
import { listCourses } from "@/lib/sites/store";
import { MESSAGES_TAG, updateOverrides, type TranslationChange } from "@/lib/translations";

const WRONG_TOKEN_DELAY_MS = 500;

export async function login(formData: FormData): Promise<{ error: string } | undefined> {
  if (!adminConfigured(process.env)) throw new Error("Not authorised.");
  const given = String(formData.get("token") ?? "");
  if (!tokenMatches(given, process.env)) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_TOKEN_DELAY_MS));
    logEvent("admin.login", { ok: false });
    return { error: "Wrong token." };
  }
  const session = await getAdminSession();
  session.admin = true;
  await session.save();
  logEvent("admin.login", { ok: true });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await requireAdmin();
  const session = await getAdminSession();
  session.destroy();
  redirect("/admin");
}

// ---- Settings and invite codes -------------------------------------------------------------------

export type ActionResult = { ok: true } | { ok: false; error: string };

const INVALID = "Check the values: limit 1–500, model id with letters, digits, dots or dashes, announcements up to 300 characters.";

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const store = defaultStore();
  const current = await readSettings(store);
  const limit = String(formData.get("dailyJobLimit") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const knownKeys = (await listCourses(store)).map((course) => course.key);
  const withDemo = withDemoCourses(current, { en: String(formData.get("demoEn") ?? ""), ro: String(formData.get("demoRo") ?? "") }, knownKeys);
  if (!withDemo) return { ok: false, error: "Pick the demo course from the list of existing courses." };
  try {
    await writeSettings(store, {
      ...withDemo,
      generationPaused: formData.get("generationPaused") === "on",
      dailyJobLimit: limit === "" ? null : Number(limit),
      model: model === "" ? null : model,
      announcement: { en: String(formData.get("announcementEn") ?? "").trim(), ro: String(formData.get("announcementRo") ?? "").trim() },
    });
  } catch {
    return { ok: false, error: INVALID };
  }
  logEvent("admin.settings", { action: "save" });
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Adds an invite code the admin typed; it is stored and shown in plain text. */
export async function createCode(label: string, code: string): Promise<ActionResult> {
  await requireAdmin();
  const store = defaultStore();
  const next = addInviteCode(await readSettings(store), String(label ?? ""), String(code ?? ""), new Date());
  if (next === "taken") return { ok: false, error: "Another code already uses that text." };
  try {
    await writeSettings(store, next);
  } catch {
    return { ok: false, error: "Give a label of 1–60 characters and a code of 4–40 letters, digits or dashes. At most 50 codes." };
  }
  logEvent("admin.settings", { action: "code-created" });
  revalidatePath("/admin");
  return { ok: true };
}

export async function setCodeActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  const store = defaultStore();
  const current = await readSettings(store);
  if (!current.codes.some((entry) => entry.id === id)) return { ok: false, error: "Unknown code." };
  await writeSettings(store, { ...current, codes: current.codes.map((entry) => (entry.id === id ? { ...entry, active } : entry)) });
  logEvent("admin.settings", { action: active ? "code-enabled" : "code-disabled" });
  revalidatePath("/admin");
  return { ok: true };
}

/** Sets a code's monthly job limit (a beta group's allowance); an empty value removes it. */
export async function setCodeLimit(id: string, value: string): Promise<ActionResult> {
  await requireAdmin();
  const store = defaultStore();
  const trimmed = value.trim();
  const limit = trimmed === "" ? null : Number(trimmed);
  if (limit !== null && !(Number.isInteger(limit) && limit >= 1 && limit <= 1000)) return { ok: false, error: "Use a whole number from 1 to 1000, or leave it empty for no limit." };
  const next = withCodeLimit(await readSettings(store), id, limit);
  if (!next) return { ok: false, error: "Unknown code." };
  await writeSettings(store, next);
  logEvent("admin.settings", { action: "code-limit" });
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteCode(id: string): Promise<ActionResult> {
  await requireAdmin();
  const store = defaultStore();
  const current = await readSettings(store);
  if (!current.codes.some((entry) => entry.id === id)) return { ok: false, error: "Unknown code." };
  await writeSettings(store, { ...current, codes: current.codes.filter((entry) => entry.id !== id) });
  logEvent("admin.settings", { action: "code-deleted" });
  revalidatePath("/admin");
  return { ok: true };
}

/** Publishes an uploaded course bundle (e.g. a demo generated locally) with the site's own storage access. */
export async function importCourse(formData: FormData): Promise<ImportResult> {
  await requireAdmin();
  const file = formData.get("bundle");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a bundle file." };
  const result = await importBundle(defaultStore(), await file.text(), new Date());
  logEvent("admin.import", { ok: result.ok, ...(result.ok ? { key: result.key } : {}) });
  if (result.ok) revalidatePath("/admin");
  return result;
}

export async function deleteCourse(key: string): Promise<ActionResult> {
  await requireAdmin();
  if (!(await removeCourseAsAdmin(defaultStore(), String(key)))) return { ok: false, error: "That course does not exist." };
  // A takedown must reach the cached page at once.
  updateTag(courseTag(String(key)));
  revalidatePath("/admin");
  return { ok: true };
}

/** Closes a report without acting on the course. */
export async function dismissReport(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!(await setReportStatus(defaultStore(), String(id), "dismissed"))) return { ok: false, error: "That report does not exist." };
  logEvent("admin.settings", { action: "report-dismissed" });
  revalidatePath("/admin");
  return { ok: true };
}

/** Saves text overrides from /admin/translations; invalid ones are returned, not stored. */
export async function saveTranslations(changes: TranslationChange[]): Promise<{ saved: number; errors: { locale: string; key: string; message: string }[] }> {
  await requireAdmin();
  if (!Array.isArray(changes) || changes.length > 500) return { saved: 0, errors: [{ locale: "", key: "", message: "Too many changes at once." }] };
  const clean = changes.map((change) => ({ locale: change.locale, key: String(change.key), value: change.value === null ? null : String(change.value) }));
  const result = await updateOverrides(defaultStore(), clean);
  if (result.saved > 0) {
    updateTag(MESSAGES_TAG);
    logEvent("admin.settings", { action: "translations", changed: result.saved });
  }
  return result;
}
