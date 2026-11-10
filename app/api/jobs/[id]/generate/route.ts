import { readFile, writeFile } from "node:fs/promises";
import { generateLecture } from "@/lib/gemini";
import { jobDirectory, readJob, writeJob } from "@/lib/job";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Invalid job id." }, { status: 400 });
  if (process.env.PORTAL_ENABLE_GENERATION !== "true") {
    return Response.json({ error: "Generation is disabled. Set PORTAL_ENABLE_GENERATION=true on the server." }, { status: 503 });
  }
  const job = await readJob(id);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  if (job.status !== "accepted") return Response.json({ error: `Job is already ${job.status}.` }, { status: 409 });

  await writeJob({ ...job, status: "running" });
  try {
    const brief = JSON.parse(await readFile(`${jobDirectory(id)}/brief.json`, "utf8"));
    const output = await generateLecture(jobDirectory(id), brief);
    await writeFile(`${jobDirectory(id)}/lecture.json`, `${JSON.stringify(JSON.parse(output), null, 2)}\n`, { flag: "wx" });
    await writeJob({ id, status: "completed", output: "lecture.json" });
    return Response.json({ id, status: "completed" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    await writeJob({ id, status: "failed", error: message });
    return Response.json({ id, status: "failed", error: message }, { status: 502 });
  }
}
