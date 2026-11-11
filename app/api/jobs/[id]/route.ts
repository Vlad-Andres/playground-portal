import { getJobHandler } from "@/lib/api/handlers";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getJobHandler(id, defaultStore());
}
