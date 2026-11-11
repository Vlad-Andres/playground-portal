import { cannedModel, type ModelClient } from "@core/generate/index";
import { geminiClient } from "@/lib/model";
import { defaultStore, type Store } from "./store";
import type { AdvanceDeps } from "./steps";

/** The fake model is allowed only outside production. */
export function useFakeModel(env: NodeJS.ProcessEnv): boolean {
  return env.PORTAL_FAKE_MODEL === "true" && env.NODE_ENV !== "production";
}

function model(env: NodeJS.ProcessEnv): ModelClient {
  if (useFakeModel(env)) return cannedModel();
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return geminiClient({ apiKey, model: env.GEMINI_MODEL ?? "gemini-3.1-flash-lite" });
}

export function runtimeDeps(env: NodeJS.ProcessEnv = process.env, store: Store = defaultStore()): AdvanceDeps {
  return { store, model: model(env), now: () => new Date(), publish: publisherFromEnv(env) };
}

/** The GitHub publisher, when GITHUB_PUBLISH_TOKEN, GITHUB_PUBLISH_OWNER and TEMPLATE_REPO are all set (package E). */
function publisherFromEnv(_env: NodeJS.ProcessEnv): AdvanceDeps["publish"] {
  return undefined;
}
