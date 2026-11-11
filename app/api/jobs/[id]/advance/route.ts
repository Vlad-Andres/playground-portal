import { advanceHandler } from "@/lib/api/handlers";
import { runtimeDeps } from "@/lib/jobs/runtime";

export const runtime = "nodejs";
// One step must finish within this limit; claims expire after 330 s (lib/jobs/claim.ts).
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return advanceHandler(id, () => runtimeDeps(), process.env);
}
