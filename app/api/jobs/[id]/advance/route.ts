import { advanceHandler } from "@/lib/api/handlers";
import { runtimeDeps } from "@/lib/jobs/runtime";
import { defaultStore } from "@/lib/jobs/store";
import { readSettings } from "@/lib/settings";

export const runtime = "nodejs";
// One step must finish within this limit; claims expire after 330 s (lib/jobs/claim.ts).
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = defaultStore();
  // Settings are read on every request, so a pause or a model change applies at once.
  const settings = await readSettings(store);
  return advanceHandler(id, () => runtimeDeps(process.env, store, settings), process.env, settings);
}
