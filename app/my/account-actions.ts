"use server";

import { updateTag } from "next/cache";
import { clearUser, requireUser } from "@/lib/auth/session";
import { defaultStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";
import { deleteAccount } from "@/lib/sites/library";
import { courseTag } from "@/lib/sites/load";

export async function deleteMyAccount(): Promise<void> {
  const user = await requireUser();
  const keys = await deleteAccount(defaultStore(), user.uid);
  for (const key of keys) updateTag(courseTag(key));
  logEvent("account.deleted", { courses: keys.length });
  await clearUser();
}
