import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { accountsConfigured, safeNext } from "@/lib/auth/config";
import { GOOGLE_SCOPES, googleClient } from "@/lib/auth/google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!accountsConfigured(process.env)) return new Response("Not found", { status: 404 });
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient(request.url).createAuthorizationURL(state, verifier, GOOGLE_SCOPES);
  const jar = await cookies();
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  jar.set("pg_oauth_state", state, options);
  jar.set("pg_oauth_verifier", verifier, options);
  jar.set("pg_oauth_next", safeNext(new URL(request.url).searchParams.get("next")), options);
  return Response.redirect(url.toString(), 302);
}
