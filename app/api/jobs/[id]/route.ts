import { readStorageFile } from "@/lib/storage";
import { jobKey } from "@/lib/job";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Invalid job id." }, { status: 400 });
  try {
    const status = await readStorageFile(jobKey(id));
    return Response.json(JSON.parse(status.toString("utf8")));
  } catch {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }
}
