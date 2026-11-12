"use server";

import { redirect } from "next/navigation";
import { clearUser } from "@/lib/auth/session";

export async function signOut(): Promise<void> {
  await clearUser();
  redirect("/");
}
