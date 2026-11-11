"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_ASSISTANT_MODEL, type AssistantModelId } from "@site/lib/assistant/gemini";
import { readAssistantModel, subscribeToAssistantModel } from "@site/lib/assistant/modelPreference";
import { useSite } from "@site/site/context";

export function useAssistantModel() {
  const { storageKey } = useSite();
  const key = storageKey("gemini-model");
  return useSyncExternalStore<AssistantModelId>(
    useCallback((listener: () => void) => subscribeToAssistantModel(key, listener), [key]),
    useCallback(() => readAssistantModel(key), [key]),
    () => DEFAULT_ASSISTANT_MODEL,
  );
}
