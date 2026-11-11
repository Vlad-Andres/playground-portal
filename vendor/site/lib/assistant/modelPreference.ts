import { ASSISTANT_MODELS, DEFAULT_ASSISTANT_MODEL, type AssistantModelId } from "@site/lib/assistant/gemini";

const listeners = new Set<() => void>();

const isAssistantModel = (value: string | null): value is AssistantModelId =>
  ASSISTANT_MODELS.some((model) => model.id === value);

export function readAssistantModel(storageKey: string): AssistantModelId {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isAssistantModel(stored) ? stored : DEFAULT_ASSISTANT_MODEL;
  } catch {
    return DEFAULT_ASSISTANT_MODEL;
  }
}

export function storeAssistantModel(storageKey: string, model: AssistantModelId) {
  try {
    window.localStorage.setItem(storageKey, model);
  } catch {}
  for (const listener of listeners) listener();
}

export function subscribeToAssistantModel(storageKey: string, listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
