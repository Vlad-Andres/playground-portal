"use server";

import { redirect } from "next/navigation";
import { claimCourse } from "@/lib/sites/library";
import { requireUser } from "@/lib/auth/session";
import { defaultStore } from "@/lib/jobs/store";

/** Attach a guest course (found by its private link) to the signed-in account. */
export async function claim(token: string): Promise<{ ok: false; code: string } | void> {
  const user = await requireUser();
  const result = await claimCourse(defaultStore(), String(token), user.uid, new Date());
  if (result !== "ok") return { ok: false, code: result };
  redirect("/my");
}
