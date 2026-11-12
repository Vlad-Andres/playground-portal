import { answersHandler } from "@/lib/api/handlers";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return answersHandler(id, request, defaultStore());
}
