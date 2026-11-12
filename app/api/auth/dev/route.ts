import { devSignInAllowed, userId } from "@/lib/auth/config";
import { saveUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Local hand checks only: never available in production (the fake model cannot run there). */
export async function GET(request: Request) {
  if (!devSignInAllowed(process.env)) return new Response("Not found", { status: 404 });
  const given = new URL(request.url).searchParams.get("name") ?? "";
  const name = /^[A-Za-z0-9]{1,20}$/.test(given) ? given : "tester";
  await saveUser({ uid: userId("google", `dev-${name}`), name });
  return Response.redirect(new URL("/my", request.url).toString(), 302);
}
