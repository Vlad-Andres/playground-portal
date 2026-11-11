import fs from "node:fs";
import path from "node:path";
import { extractPdf } from "../../playground-template/scripts/generate/extract-pdf";
import { advanceHandler, bundleHandler, createJobHandler, getJobHandler, outlineHandler } from "../lib/api/handlers";
import { defaultStore } from "../lib/jobs/store";
import { runtimeDeps } from "../lib/jobs/runtime";

async function main() {
  // 1. Load environment from template .env.local if not already in process.env
  const templateEnv = path.resolve(process.cwd(), "../playground-template/.env.local");
  if (fs.existsSync(templateEnv)) {
    try {
      process.loadEnvFile(templateEnv);
    } catch (e) {
      console.error("Could not load template .env.local:", e);
    }
  }

  const accessCode = "local-e2e-proof-code-1234";
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORTAL_ENABLE_GENERATION: "true",
    PORTAL_ACCESS_CODE: accessCode,
    PORTAL_FAKE_MODEL: "false",
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
  };

  if (!env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from environment.");
    process.exit(1);
  }

  const pdfPath = path.resolve(process.cwd(), "../playground-template/materials/Lecture_01-Introduction-2026-2.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error("Sample PDF not found at:", pdfPath);
    process.exit(1);
  }

  console.log("=== Task D5: End-to-end portal real run ===");
  console.log(`Extracting text from ${path.basename(pdfPath)}...`);
  const t0 = Date.now();
  const material = await extractPdf(pdfPath);
  console.log(`Extracted ${material.pages.length} pages (${material.pages.reduce((s, p) => s + p.text.length, 0)} characters) in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

  const store = defaultStore();
  const brief = {
    language: "en",
    level: "university" as const,
    depth: "standard" as const,
    quizzes: true,
    widgets: true,
    examMode: true,
    context: "Introduction to data-intensive systems, reliability, scalability, maintainability.",
  };

  console.log("\nCreating job in portal...");
  const createReq = new Request("http://localhost:3000/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode, brief, materials: [material] }),
  });
  const createRes = await createJobHandler(createReq, store, env);
  if (!createRes.ok) {
    console.error(`Job creation failed (${createRes.status}):`, await createRes.text());
    process.exit(1);
  }
  const { id } = (await createRes.json()) as { id: string };
  console.log(`Job created: ${id}`);

  const deps = () => runtimeDeps(env, store);

  // Advance step 1: plan
  console.log("\nPlanning course...");
  let advRes = await advanceHandler(id, deps, env);
  let state = (await advRes.json()) as any;
  console.log(`State after plan: step=${state.step}, status=${state.status}`);

  if (state.status !== "awaiting-review") {
    console.error("Expected awaiting-review, got:", state);
    process.exit(1);
  }

  const jobRes = await getJobHandler(id, store);
  const jobData = (await jobRes.json()) as any;
  console.log(`Plan produced ${jobData.outline?.length} lectures:`);
  for (const lec of jobData.outline ?? []) {
    console.log(` - ${lec.title} (${lec.slug})`);
  }

  // Outline review: accept all lectures
  console.log("\nAccepting outline...");
  const keep = jobData.outline.map((l: any) => l.slug);
  const outlineReq = new Request(`http://localhost:3000/api/jobs/${id}/outline`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keep, titles: {} }),
  });
  const outlineRes = await outlineHandler(id, outlineReq, store);
  if (!outlineRes.ok) {
    console.error("Outline update failed:", await outlineRes.text());
    process.exit(1);
  }

  // Step through lectures and finish
  while (state.status !== "done" && state.status !== "failed") {
    console.log(`\nAdvancing step ${state.step}...`);
    const stepT0 = Date.now();
    advRes = await advanceHandler(id, deps, env);
    state = (await advRes.json()) as any;
    const dur = ((Date.now() - stepT0) / 1000).toFixed(1);
    console.log(`Step ${state.step} finished in ${dur}s -> status=${state.status}, calls=${state.usage.calls}, tokens=${state.usage.inputTokens + state.usage.outputTokens}`);
    if (state.status === "failed") {
      console.error("Job failed with error:", state.error);
      process.exit(1);
    }
  }

  console.log("\nJob finished successfully!");
  console.log(`Usage: ${state.usage.calls} calls, ${state.usage.inputTokens} input tokens, ${state.usage.outputTokens} output tokens.`);

  // Download bundle
  const bundleRes = await bundleHandler(id, store);
  if (!bundleRes.ok) {
    console.error("Failed to retrieve bundle:", await bundleRes.text());
    process.exit(1);
  }
  const bundleText = await bundleRes.text();
  const outDir = path.resolve(process.cwd(), "../playground-template/.model-output");
  fs.mkdirSync(outDir, { recursive: true });
  const bundleFile = path.join(outDir, "portal-bundle.json");
  fs.writeFileSync(bundleFile, bundleText);
  console.log(`Bundle saved to ${bundleFile} (${Buffer.byteLength(bundleText)} bytes).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
