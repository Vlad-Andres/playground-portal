"use client";

import { useCallback, useSyncExternalStore } from "react";
import { apiKeyStatus, subscribeToApiKey, type KeyStatus } from "@site/lib/assistant/credentials";
import { useSite } from "@site/site/context";

export function useApiKeyStatus() {
  const { storageKey } = useSite();
  const key = storageKey("gemini-api-key");
  return useSyncExternalStore<KeyStatus>(
    useCallback((listener: () => void) => subscribeToApiKey(key, listener), [key]),
    useCallback(() => apiKeyStatus(key), [key]),
    () => "none",
  );
}
