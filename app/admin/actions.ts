"use server";

import { redirect } from "next/navigation";
import { adminConfigured, getAdminSession, requireAdmin, tokenMatches } from "@/lib/admin/session";
import { logEvent } from "@/lib/log";

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
