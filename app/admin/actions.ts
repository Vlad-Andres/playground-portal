"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminConfigured, getAdminSession, requireAdmin, tokenMatches } from "@/lib/admin/session";
import { defaultStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { newInviteCode, readSettings, writeSettings } from "@/lib/settings";

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
  try {
    await writeSettings(store, {
      ...current,
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
  return { ok: true };
}

/** Returns the new code once; only its hash is stored. */
export async function createCode(label: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  await requireAdmin();
  const store = defaultStore();
  const current = await readSettings(store);
  const { code, entry } = newInviteCode(String(label ?? ""), new Date());
  try {
    await writeSettings(store, { ...current, codes: [...current.codes, entry] });
  } catch {
    return { ok: false, error: "Give the code a label of 1–60 characters. At most 50 codes." };
  }
  logEvent("admin.settings", { action: "code-created" });
  revalidatePath("/admin");
  return { ok: true, code };
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
