import { createHash, timingSafeEqual } from "node:crypto";
import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { accountsConfigured, safeNext, userId } from "@/lib/auth/config";
import { googleClient } from "@/lib/auth/google";
import { saveUser } from "@/lib/auth/session";
import { logEvent } from "@/lib/log";

export const runtime = "nodejs";

const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export async function GET(request: Request) {
  if (!accountsConfigured(process.env)) return new Response("Not found", { status: 404 });
  const jar = await cookies();
  const state = jar.get("pg_oauth_state")?.value ?? "";
  const verifier = jar.get("pg_oauth_verifier")?.value ?? "";
  const next = safeNext(jar.get("pg_oauth_next")?.value);
  for (const name of ["pg_oauth_state", "pg_oauth_verifier", "pg_oauth_next"]) jar.delete(name);
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  try {
    if (!code || !state || !verifier || !same(params.get("state") ?? "", state)) throw new Error("bad state");
    const tokens = await googleClient(request.url).validateAuthorizationCode(code, verifier);
    const claims = decodeIdToken(tokens.idToken()) as { sub?: unknown; name?: unknown };
    if (typeof claims.sub !== "string" || !claims.sub) throw new Error("no subject");
    await saveUser({ uid: userId("google", claims.sub), name: typeof claims.name === "string" ? claims.name.slice(0, 60) : "" });
    logEvent("auth.signin", { ok: true });
    return Response.redirect(new URL(next, request.url).toString(), 302);
  } catch {
    logEvent("auth.signin", { ok: false });
    return Response.redirect(new URL("/?signin=failed", request.url).toString(), 302);
  }
}
