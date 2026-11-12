import { courseJobHandler } from "@/lib/api/handlers";
import { currentUser } from "@/lib/auth/session";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  return courseJobHandler(key, request, defaultStore(), process.env, await currentUser());
}
