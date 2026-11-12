import { createHash } from "node:crypto";

/** Accounts exist only when the Google client and a 32+ character session secret are configured. */
export function accountsConfigured(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.AUTH_GOOGLE_ID) && Boolean(env.AUTH_GOOGLE_SECRET) && (env.SESSION_SECRET ?? "").length >= 32;
}

export const USER_ID = /^[0-9a-f]{32}$/;

/** A stable, opaque user id; the provider's own id is never stored. */
export function userId(provider: "google", subject: string): string {
  return createHash("sha256").update(`${provider}:${subject}`, "utf8").digest("hex").slice(0, 32);
}

/** The local sign-in shortcut: never in production, only with the fake model and accounts configured. */
export function devSignInAllowed(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV !== "production" && env.PORTAL_FAKE_MODEL === "true" && accountsConfigured(env);
}

/** A path to return to after sign-in: same-site only, defaults to /my. */
export function safeNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/my";
}
