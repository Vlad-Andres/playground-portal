export interface PersistentStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (updater: T | ((previous: T) => T)) => void;
}

export function createPersistentStore<T>(
  key: string,
  fallback: T,
  revive: (raw: unknown) => T | null,
): PersistentStore<T> {
  let state = fallback;
  let hydrated = false;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const read = () => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return revive(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  const hydrate = () => {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;

    const stored = read();
    if (stored) {
      state = stored;
      emit();
    }

    window.addEventListener("storage", (event) => {
      if (event.key !== key) return;
      const next = read();
      state = next ?? fallback;
      emit();
    });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      hydrate();
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    getServerSnapshot: () => fallback,
    set(updater) {
      const next =
        typeof updater === "function" ? (updater as (previous: T) => T)(state) : updater;
      if (next === state) return;
      state = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Private browsing or storage quota: progress simply is not persisted.
      }
      emit();
    },
  };
}
