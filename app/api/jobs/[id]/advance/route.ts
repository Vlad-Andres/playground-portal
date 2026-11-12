import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { courseTag } from "@/lib/sites/load";
import { advanceJob, shouldChain } from "@/lib/api/handlers";
import { runtimeDeps } from "@/lib/jobs/runtime";
import { defaultStore } from "@/lib/jobs/store";
import { readSettings } from "@/lib/settings";

export const runtime = "nodejs";
// One step must finish within this limit; claims expire after 330 s (lib/jobs/claim.ts).
export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = defaultStore();
  // Settings are read on every request, so a pause or a model change applies at once.
  const settings = await readSettings(store);
  const { response, state } = await advanceJob(id, () => ({ ...runtimeDeps(process.env, store, settings), onCourseChanged: (key: string) => revalidateTag(courseTag(key), "max") }), process.env, settings);
  // A step that finished cleanly starts the next one from the server, so a closed tab cannot stop the job.
  if (state && shouldChain(state)) {
    after(() => {
      // The timeout only stops waiting for the answer; the request it started keeps running on the server.
      fetch(request.url, { method: "POST", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    });
  }
  return response;
}
