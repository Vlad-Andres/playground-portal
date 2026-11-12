import { accountsConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Whether accounts are on and who is signed in (name only); never the user id. */
export async function GET() {
  const enabled = accountsConfigured(process.env);
  const user = enabled ? await currentUser() : null;
  return Response.json({ enabled, signedIn: Boolean(user), name: user?.name ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
