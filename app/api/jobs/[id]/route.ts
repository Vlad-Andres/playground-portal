import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Invalid job id." }, { status: 400 });
  try {
    const status = await readFile(path.join(process.cwd(), "jobs", id, "status.json"), "utf8");
    return Response.json(JSON.parse(status));
  } catch {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }
}
