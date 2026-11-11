export type KeyPersistence = "session" | "device";
export type KeyStatus = "none" | KeyPersistence;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function safely<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

export function readApiKey(storageKey: string): string | null {
  return safely(
    () => window.sessionStorage.getItem(storageKey) ?? window.localStorage.getItem(storageKey),
    null,
  );
}

export function apiKeyStatus(storageKey: string): KeyStatus {
  return safely<KeyStatus>(() => {
    if (window.sessionStorage.getItem(storageKey)) return "session";
    if (window.localStorage.getItem(storageKey)) return "device";
    return "none";
  }, "none");
}

export function storeApiKey(storageKey: string, apiKey: string, persistence: KeyPersistence) {
  safely(() => {
    window.sessionStorage.removeItem(storageKey);
    window.localStorage.removeItem(storageKey);
    const storage = persistence === "device" ? window.localStorage : window.sessionStorage;
    storage.setItem(storageKey, apiKey);
  }, undefined);
  emit();
}

export function clearApiKey(storageKey: string) {
  safely(() => {
    window.sessionStorage.removeItem(storageKey);
    window.localStorage.removeItem(storageKey);
  }, undefined);
  emit();
}

export function subscribeToApiKey(storageKey: string, listener: () => void) {
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
