import { createHash, timingSafeEqual } from "node:crypto";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "pg_admin";
const MIN_TOKEN_LENGTH = 24;
const SESSION_HOURS = 8;

export interface AdminSession {
  admin?: true;
}

/** `/admin` exists only when ADMIN_TOKEN has 24 or more characters. */
export function adminConfigured(env: NodeJS.ProcessEnv): boolean {
  return (env.ADMIN_TOKEN ?? "").length >= MIN_TOKEN_LENGTH;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time comparison of the given token with ADMIN_TOKEN. */
export function tokenMatches(given: string, env: NodeJS.ProcessEnv): boolean {
  if (!adminConfigured(env)) return false;
  return timingSafeEqual(digest(given), digest(env.ADMIN_TOKEN as string));
}

/** The cookie password: derived from the token, so it is 64 characters and the token itself is never used as a key. */
export function sessionPassword(env: NodeJS.ProcessEnv): string {
  return createHash("sha256").update(env.ADMIN_TOKEN ?? "", "utf8").digest("hex");
}

function options(env: NodeJS.ProcessEnv): SessionOptions {
  return {
    cookieName: ADMIN_COOKIE,
    password: sessionPassword(env),
    ttl: SESSION_HOURS * 60 * 60,
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin" },
  };
}

export async function getAdminSession(env: NodeJS.ProcessEnv = process.env): Promise<IronSession<AdminSession>> {
  return getIronSession<AdminSession>(await cookies(), options(env));
}

/** Throws unless the admin is configured and this request carries a valid admin session. Call it first in every admin action. */
export async function requireAdmin(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (!adminConfigured(env)) throw new Error("Not authorised.");
  const session = await getAdminSession(env);
  if (session.admin !== true) throw new Error("Not authorised.");
}
