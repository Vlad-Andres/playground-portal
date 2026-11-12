import { choiceHandler } from "@/lib/api/handlers";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return choiceHandler(id, request, defaultStore());
}
